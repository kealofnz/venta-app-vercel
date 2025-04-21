// api/vendedores.js
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
    console.log(`Buscando vendedores con término: "${term || '(ninguno)'}"`); // Log

    try {
        let sql = '';
        let params = [];
        // Ajusta nombres de columna y tabla si es necesario. Busca en la tabla USUARIO.
        // Puedes añadir un filtro por ROL si solo quieres ciertos usuarios: ... FROM USUARIO WHERE ROL = 'Vendedor'"
        const baseSql = "SELECT `ID USUARIO`, `NOMBRE`, `APELLIDO`, `EMAIL` FROM USUARIO";

        if (term) {
            // Si hay término, buscar por nombre, apellido, ID o email
            // Si filtraste por ROL en baseSql, aquí debes usar AND en lugar de WHERE
            sql = `${baseSql} WHERE (\`NOMBRE\` LIKE ? OR \`APELLIDO\` LIKE ? OR \`ID USUARIO\` LIKE ? OR \`EMAIL\` LIKE ?) ORDER BY NOMBRE ASC, APELLIDO ASC LIMIT 20`;
            const searchTerm = `%${term}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        } else {
            // Si no hay término, devolver los primeros 20 ordenados
            // Si filtras por ROL, asegúrate de incluirlo aquí también si es necesario
            sql = `${baseSql} ORDER BY NOMBRE ASC, APELLIDO ASC LIMIT 20`;
            params = [];
        }

        console.log('Ejecutando SQL Vendedores:', sql, params); // Log para depuración
        const sellers = await query(sql, params); // Ejecuta la consulta
        console.log('Vendedores encontrados:', sellers.length); // Log para depuración

        // Enviar respuesta exitosa con los vendedores en formato JSON
        res.status(200).json(sellers);

    } catch (error) {
        // Captura cualquier error durante la ejecución
        console.error('Error en API /api/vendedores:', error);
        // Enviar una respuesta genérica de error al cliente
        res.status(500).json({ error: 'Error interno del servidor al obtener los vendedores.' });
    }
}; // Fin de module.exports