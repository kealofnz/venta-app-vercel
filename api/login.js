// api/login.js
const { query } = require('./_utils/db');

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
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requerido' });

        console.log(`Login attempt for email: ${email}`); // Log

        // Busca el usuario en tu tabla USUARIO
        // Ajusta los nombres de columna si son diferentes
        const sql = "SELECT `ID USUARIO`, `NOMBRE`, `APELLIDO`, `EMAIL` FROM USUARIO WHERE `EMAIL` = ? LIMIT 1";
        const users = await query(sql, [email]);

        if (users.length > 0) {
            const user = users[0];
            console.log(`User found: ${user['ID USUARIO']}`); // Log
            res.status(200).json({
                success: true,
                email: user.EMAIL,
                userId: user['ID USUARIO'],
                name: `${user.NOMBRE || ''} ${user.APELLIDO || ''}`.trim()
            });
        } else {
            console.log(`User not found for email: ${email}`); // Log
            // Decidimos permitir el acceso aunque no exista en la BD (según requerimiento anterior)
            // Podrías cambiar esto y devolver un error si prefieres:
            // res.status(404).json({ success: false, error: 'Email no registrado' });
             res.status(200).json({
                success: true, // Aún así decimos éxito para que el frontend continúe
                email: email,
                userId: null, // No hay ID
                name: email // Usamos el email como nombre
            });
        }
    } catch (error) {
        console.error('Error en API /api/login:', error);
        res.status(500).json({ error: 'Error interno al verificar el email.' });
    }
}