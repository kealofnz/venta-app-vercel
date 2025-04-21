// api/guardar-venta.js
const { transaction } = require('./_utils/db'); // Importa la función transaction de nuestra utilidad

// Cambia export default por module.exports = async (req, res) =>
module.exports = async (req, res) => {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    // ¡IMPORTANTE! En producción real, reemplaza '*' con la URL de tu sitio Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS'); // Solo POST para esta función
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Cabeceras permitidas

    // Manejo de la petición pre-vuelo (preflight) OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- Fin CORS ---

    // --- Method Check ---
    // Asegurarse de que solo se acepten peticiones POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']); // Informa al cliente qué método se permite
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }

    try {
        // Obtener datos del cuerpo de la petición JSON enviado por el frontend
        const {
            saleId, saleDate, clientId, sellerId, userEmail, // Datos principales
            paymentType, comments, totalDiscounts, totalSale, products // Datos adicionales y array de productos
        } = req.body;

        // --- Validaciones Robustas de los Datos Recibidos ---
        let validationError = null;
        if (!saleId) validationError = 'Falta ID de Venta (saleId).';
        else if (!saleDate) validationError = 'Falta Fecha de Venta (saleDate).';
        else if (!clientId) validationError = 'Falta ID de Cliente (clientId).';
        else if (!userEmail) validationError = 'Falta Email de Vendedor (userEmail).'; // Necesitamos al menos el email
        else if (!paymentType) validationError = 'Falta Tipo de Pago (paymentType).';
        else if (!products || !Array.isArray(products) || products.length === 0) {
            validationError = 'Faltan productos o el formato es incorrecto.';
        } else {
            // Validar cada producto en el array
            for (const [index, product] of products.entries()) {
                if (!product.detailSaleId) { validationError = `Falta ID Detalle Venta para producto ${index + 1}.`; break; }
                if (!product.productId) { validationError = `Falta ID Producto para producto ${index + 1}.`; break; }
                if (!product.quantity || product.quantity <= 0) { validationError = `Cantidad inválida para producto ${product.productId || index + 1}.`; break; }
                if (product.unitPrice === undefined || product.unitPrice < 0) { validationError = `Precio unitario inválido para producto ${product.productId || index + 1}.`; break; }
                if (product.discount === undefined || product.discount < 0) { validationError = `Descuento inválido para producto ${product.productId || index + 1}.`; break; }
            }
        }

        if (validationError) {
            console.warn('Guardar venta: Validación fallida.', validationError, req.body); // Log detallado
            // Devolver 'Bad Request' si faltan datos o son inválidos
            return res.status(400).json({ error: validationError });
        }
        // --- Fin Validaciones ---

        console.log(`Guardando venta ${saleId} para cliente ${clientId} por ${userEmail} con ${products.length} items`); // Log

        // Ejecutar las inserciones dentro de una transacción para asegurar atomicidad
        const resultData = await transaction(async (connection) => {
            // 'connection' es una conexión dedicada del pool para esta transacción

            // 1. INSERT en VENTA
            // Asegúrate que los nombres de columna coincidan exactamente con tu tabla VENTA
            const sqlVenta = "INSERT INTO VENTA (`ID VENTA`, `ID CLIENTE`, `FECHA DE VENTA`, `ID VENDEDOR`, `EMAIL`, `FORMA PAGO`, `NOVEDADES`, `ESTADO`, `DESCUENTO`, `HORA VENTA`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURTIME())";
            const estadoVenta = 'COMPLETADA'; // O 'PENDIENTE' si hay más pasos
            // Prepara los parámetros en el orden correcto. Usa null si sellerId no vino.
            const paramsVenta = [
                saleId,
                clientId,
                saleDate,
                sellerId || null, // ID Vendedor puede ser null si no se encontró en login
                userEmail,
                paymentType,
                comments || '', // Usar string vacío si comments es null/undefined
                estadoVenta,
                totalDiscounts || 0 // Usar 0 si totalDiscounts es null/undefined
            ];
            console.log('Ejecutando SQL Venta:', sqlVenta, paramsVenta); // Log
            await connection.execute(sqlVenta, paramsVenta); // Ejecuta dentro de la transacción

            // 2. INSERT en DETALLE VENTA (loop)
            // Asegúrate que los nombres de columna coincidan con tu tabla DETALLE VENTA
            const sqlDetalle = "INSERT INTO `DETALLE VENTA` (`ID DETALLE VENTA`, `ID VENTA`, `ID_PRODUCTO`, `CANTIDAD`, `PRECIO UNITARIO`, `DESCUENTO`, `FECHA DETALLE VENTA`) VALUES (?, ?, ?, ?, ?, ?, ?)";
            const currentDbDate = new Date().toISOString().slice(0, 10); // Fecha para los detalles (YYYY-MM-DD)

            for (const product of products) {
                const paramsDetalle = [
                    product.detailSaleId,
                    saleId, // El ID de la venta principal
                    product.productId,
                    product.quantity,
                    product.unitPrice,
                    product.discount,
                    currentDbDate // O podrías usar 'saleDate' si prefieres
                ];
                console.log('Ejecutando SQL Detalle:', sqlDetalle, paramsDetalle); // Log
                await connection.execute(sqlDetalle, paramsDetalle); // Ejecuta dentro de la transacción
            }

            // Si llegamos aquí sin errores, la función 'transaction' hará commit automáticamente
            // Devolvemos un objeto con datos útiles que se pasarán al .then() en el frontend
            return { saleId: saleId, itemsSaved: products.length, clientId: clientId };
        }); // Fin de la función pasada a 'transaction'

        // Si la transacción fue exitosa (la función transaction no lanzó error)
        console.log(`Venta ${resultData.saleId} guardada exitosamente.`); // Log de éxito
        // Enviar respuesta 'Created' al frontend con los datos devueltos por la transacción
        res.status(201).json({
            success: true,
            message: `Venta ${resultData.saleId} registrada con ${resultData.itemsSaved} items.`,
            data: resultData // Contiene saleId, itemsSaved, etc.
        });

    } catch (error) {
        // Si la transacción falló (rollback automático) o hubo otro error
        // El error ya fue loggeado por la función transaction o query
        console.error('Error final capturado en API /api/guardar-venta:', error.message); // Log adicional
        // Enviar respuesta 'Internal Server Error' al cliente
        res.status(500).json({ error: error.message || 'Error interno del servidor al intentar guardar la venta.' });
    }
}; // Fin de module.exports