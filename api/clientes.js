// api/clientes.js
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
        // Ajusta nombres de columna si es necesario
        const baseSql = "SELECT `ID CLIENTE`, `CLIENTE`, `DIRECCION`, `TELEFONO` FROM CLIENTES";

        if (term) {
            sql = `${baseSql} WHERE (\`CLIENTE\` LIKE ? OR \`ID CLIENTE\` LIKE ?) LIMIT 20`;
            const searchTerm = `%${term}%`;
            params = [searchTerm, searchTerm];
        } else {
            sql = `${baseSql} ORDER BY CLIENTE ASC LIMIT 20`; // Ordenar alfabéticamente si no hay búsqueda
            params = [];
        }
        console.log('Ejecutando SQL Clientes:', sql, params); // Log
        const clients = await query(sql, params);
        console.log('Clientes encontrados:', clients.length); // Log
        res.status(200).json(clients);

    } catch (error) {
        console.error('Error en API /api/clientes:', error);
        res.status(500).json({ error: 'Error al obtener los clientes.' });
    }
}