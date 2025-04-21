// api/guardar-venta.js
const { transaction } = require('./_utils/db'); // Importa la función transaction

export default async function handler(req, res) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // O tu dominio
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    // --- Method Check ---
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const {
            saleId, saleDate, clientId, sellerId, userEmail,
            paymentType, comments, totalDiscounts, totalSale, products
        } = req.body;

         // Validaciones robustas
         if (!saleId || !saleDate || !clientId || !userEmail || !paymentType || !products || !Array.isArray(products) || products.length === 0) {
             console.warn('Guardar venta: Faltan datos requeridos.', req.body); // Log detallado
             return res.status(400).json({ error: 'Faltan datos requeridos para la venta.' });
         }

         console.log(`Guardando venta ${saleId} para cliente ${clientId} por ${userEmail}`); // Log

        // Ejecutar dentro de una transacción
        const resultData = await transaction(async (connection) => {
            // Aquí 'connection' es una conexión dedicada para esta transacción

            // 1. INSERT en VENTA
            const sqlVenta = "INSERT INTO VENTA (`ID VENTA`, `ID CLIENTE`, `FECHA DE VENTA`, `ID VENDEDOR`, `EMAIL`, `FORMA PAGO`, `NOVEDADES`, `ESTADO`, `DESCUENTO`, `HORA VENTA`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURTIME())";
            const estadoVenta = 'PENDIENTE'; // O 'COMPLETADA' si no hay proceso posterior
            const paramsVenta = [saleId, clientId, saleDate, sellerId || null, userEmail, paymentType, comments || '', estadoVenta, totalDiscounts || 0];
            console.log('Ejecutando Venta:', sqlVenta, paramsVenta); // Log
            await connection.execute(sqlVenta, paramsVenta);

            // 2. INSERT en DETALLE VENTA (loop)
            const sqlDetalle = "INSERT INTO `DETALLE VENTA` (`ID DETALLE VENTA`, `ID VENTA`, `ID_PRODUCTO`, `CANTIDAD`, `PRECIO UNITARIO`, `DESCUENTO`, `FECHA DETALLE VENTA`) VALUES (?, ?, ?, ?, ?, ?, ?)";
            const currentDbDate = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD

            for (const product of products) {
                // Validar cada producto del detalle
                if (!product.detailSaleId || !product.productId || !product.quantity || product.quantity <= 0 || product.unitPrice === undefined || product.discount === undefined) {
                     console.error('Guardar venta: Datos de detalle inválidos:', product); // Log detallado
                     throw new Error(`Datos inválidos para el producto ${product.productId || 'desconocido'}.`);
                }
                const paramsDetalle = [
                    product.detailSaleId, saleId, product.productId,
                    product.quantity, product.unitPrice, product.discount,
                    currentDbDate // O usar saleDate si prefieres
                ];
                 console.log('Ejecutando Detalle:', sqlDetalle, paramsDetalle); // Log
                 await connection.execute(sqlDetalle, paramsDetalle);
            }

            // Si todo fue bien, la función transaction hará commit automáticamente
             // Devolver datos útiles al frontend
             return { saleId: saleId, itemsSaved: products.length };
        }); // Fin de la función transaction

        // Si la transacción fue exitosa (no lanzó error)
         res.status(201).json({
             success: true,
             message: `Venta ${resultData.saleId} registrada con ${resultData.itemsSaved} items.`,
             data: resultData // Devolver el objeto con saleId y itemsSaved
         });

    } catch (error) {
        // El error ya fue loggeado por la función transaction o query
        console.error('Error final en API /api/guardar-venta:', error.message); // Log adicional
        res.status(500).json({ error: error.message || 'Error interno al intentar guardar la venta.' });
    }
}