// api/productos.js
const { query } = require('./_utils/db'); // require() arriba

// Cambia export default por module.exports = async (req, res) =>
module.exports = async (req, res) => {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    // ¡IMPORTANTE! En producción real, reemplaza '*' con la URL de tu sitio Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS'); // Solo GET para esta función
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Cabeceras permitidas

    // Manejo de la petición pre-vuelo (preflight) OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- Fin CORS ---

    // --- Method Check ---
    // Asegurarse de que solo se acepten peticiones GET
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']); // Informa al cliente qué método se permite
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }

    // Obtener el término de búsqueda de la URL (?term=...)
    const { term } = req.query;
    console.log(`Buscando productos con término: "${term || '(ninguno)'}"`); // Log

    try {
        let sql = '';
        let params = [];
        // Ajusta nombres de columna y tabla si es necesario
        // Asegúrate de que la columna ESTADO exista y tenga valores como 'ACTIVO'/'INACTIVO'
        const baseSql = "SELECT `ID PRODUCTO`, `NOMBRE PRODUCTO`, `UNIDAD`, `PRECIO VENTA`, `ESTADO` FROM PRODUCTO WHERE (`ESTADO` IS NULL OR `ESTADO` != 'INACTIVO')";

        if (term) {
            // Si hay término, buscar por nombre o ID
            sql = `${baseSql} AND (\`NOMBRE PRODUCTO\` LIKE ? OR \`ID PRODUCTO\` LIKE ?) ORDER BY \`NOMBRE PRODUCTO\` ASC LIMIT 20`;
            const searchTerm = `%${term}%`;
            params = [searchTerm, searchTerm];
        } else {
            // Si no hay término, devolver los primeros 20 activos ordenados
            sql = `${baseSql} ORDER BY \`NOMBRE PRODUCTO\` ASC LIMIT 20`;
            params = [];
        }

        console.log('Ejecutando SQL Productos:', sql, params); // Log para depuración
        const products = await query(sql, params); // Ejecuta la consulta
        console.log('Productos encontrados:', products.length); // Log para depuración

        // Enviar respuesta exitosa con los productos en formato JSON
        res.status(200).json(products);

    } catch (error) {
        // Captura cualquier error durante la ejecución
        console.error('Error en API /api/productos:', error);
        // Enviar una respuesta genérica de error al cliente
        res.status(500).json({ error: 'Error interno del servidor al obtener los productos.' });
    }
}; // Fin de module.exports