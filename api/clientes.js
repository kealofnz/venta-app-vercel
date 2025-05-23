// api/clientes.js
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
    console.log(`Buscando clientes con término: "${term || '(ninguno)'}"`); // Log

    try {
        let sql = '';
        let params = [];
        // Ajusta nombres de columna y tabla si es necesario
        // Asumiendo que las columnas principales son ID CLIENTE y CLIENTE (nombre)
        const baseSql = "SELECT `ID CLIENTE`, `CLIENTE`, `DIRECCION`, `TELEFONO` FROM CLIENTES"; // Ajusta las columnas que necesitas devolver

        if (term) {
            // Si hay término, buscar por nombre (CLIENTE) o ID
            sql = `${baseSql} WHERE (\`CLIENTE\` LIKE ? OR \`ID CLIENTE\` LIKE ?) ORDER BY CLIENTE ASC LIMIT 20`;
            const searchTerm = `%${term}%`;
            params = [searchTerm, searchTerm];
        } else {
            // Si no hay término, devolver los primeros 20 ordenados
            sql = `${baseSql} ORDER BY CLIENTE ASC LIMIT 20`;
            params = [];
        }

        console.log('Ejecutando SQL Clientes:', sql, params); // Log para depuración
        const clients = await query(sql, params); // Ejecuta la consulta
        console.log('Clientes encontrados:', clients.length); // Log para depuración

        // Enviar respuesta exitosa con los clientes en formato JSON
        res.status(200).json(clients);

    } catch (error) {
        // Captura cualquier error durante la ejecución
        console.error('Error en API /api/clientes:', error);
        // Enviar una respuesta genérica de error al cliente
        res.status(500).json({ error: 'Error interno del servidor al obtener los clientes.' });
    }
}; // Fin de module.exports