// api/login.js
const { query } = require('./_utils/db'); // require() arriba

// Cambia export default por module.exports = async (req, res) =>
module.exports = async (req, res) => {
    // --- CORS Headers ---
    // (Estas cabeceras son importantes para permitir que tu frontend llame a la API)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // ¡IMPORTANTE! En producción real, reemplaza '*' con la URL de tu sitio Vercel
    // Ejemplo: res.setHeader('Access-Control-Allow-Origin', 'https://venta-app-vercel-xxxxx.vercel.app');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS'); // Métodos permitidos para esta función
    // Cabeceras que el frontend puede enviar
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejo de la petición pre-vuelo (preflight) OPTIONS que envía el navegador
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
        // Obtener el email del cuerpo de la petición JSON
        const { email } = req.body;
        if (!email) {
             // Si no se envió el email, devolver un error 'Bad Request'
            return res.status(400).json({ error: 'Email requerido en el cuerpo de la petición.' });
        }

        console.log(`Login attempt for email: ${email}`); // Log para depuración

        // Busca el usuario en tu tabla USUARIO
        // Ajusta los nombres de columna si son diferentes
        const sql = "SELECT `ID USUARIO`, `NOMBRE`, `APELLIDO`, `EMAIL` FROM USUARIO WHERE `EMAIL` = ? LIMIT 1";
        const users = await query(sql, [email]); // Ejecuta la consulta segura

        if (users.length > 0) {
            // Usuario encontrado
            const user = users[0];
            const userName = `${user.NOMBRE || ''} ${user.APELLIDO || ''}`.trim();
            console.log(`User found: ${user['ID USUARIO']} - ${userName}`); // Log
            // Devuelve éxito y los datos del usuario
            res.status(200).json({
                success: true,
                email: user.EMAIL,
                userId: user['ID USUARIO'],
                name: userName || user.EMAIL // Si no hay nombre, usa el email
            });
        } else {
            // Usuario no encontrado
            console.log(`User not found for email: ${email}`); // Log
            // Permitir el acceso aunque no exista en la BD (según requerimiento anterior)
            res.status(200).json({
                success: true, // Aún así decimos éxito para que el frontend continúe
                email: email,
                userId: null, // No hay ID
                name: email // Usamos el email como nombre
            });
            // --- Alternativa: Devolver error si el email no existe ---
            // console.log(`User not found for email: ${email}, returning error.`);
            // res.status(404).json({ success: false, error: 'Email no registrado.' });
            // --- Fin Alternativa ---
        }
    } catch (error) {
        // Captura cualquier error durante la ejecución (DB, etc.)
        console.error('Error en API /api/login:', error);
        res.status(500).json({ error: 'Error interno del servidor al verificar el email.' });
    }
}; // Fin de module.exports