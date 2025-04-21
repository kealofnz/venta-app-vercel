// api/vendedores.js
const { query } = require('./_utils/db');

export default async function handler(req, res) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // O tu dominio
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    // --- Method Check ---
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

    const { term } = req.query;

    try {
        let sql = '';
        let params = [];
        // Ajusta nombres de columna si es necesario. Filtra por ROL si aplica.
        const baseSql = "SELECT `ID USUARIO`, `NOMBRE`, `APELLIDO`, `EMAIL` FROM USUARIO";
        // const baseSql = "SELECT `ID USUARIO`, `NOMBRE`, `APELLIDO`, `EMAIL` FROM USUARIO WHERE ROL = 'VENDEDOR'"; // Ejemplo con filtro de rol

        if (term) {
            sql = `${baseSql} WHERE (\`NOMBRE\` LIKE ? OR \`APELLIDO\` LIKE ? OR \`ID USUARIO\` LIKE ? OR \`EMAIL` LIKE ?) LIMIT 20`;
            // Si filtraste por rol, quita el WHERE y usa AND:
            // sql = `${baseSql} AND (\`NOMBRE\` LIKE ? OR ...)`
            const searchTerm = `%${term}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        } else {
            sql = `${baseSql} ORDER BY NOMBRE ASC, APELLIDO ASC LIMIT 20`;
            params = [];
        }

        console.log('Ejecutando SQL Vendedores:', sql, params); // Log
        const sellers = await query(sql, params);
        console.log('Vendedores encontrados:', sellers.length); // Log
        res.status(200).json(sellers);

    } catch (error) {
        console.error('Error en API /api/vendedores:', error);
        res.status(500).json({ error: 'Error al obtener los vendedores.' });
    }
}