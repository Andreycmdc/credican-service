require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Retiro = require('./models/Retiro');
const auth = require('./middleware/auth');
const ePayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true
});

const app = express();
app.use(express.json());
app.use(cors());

// ? Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("? Conectado a MongoDB"))
.catch(err => console.error("? Error al conectar:", err.message));

// ? Rutas
app.get('/', (req, res) => res.send('? API de retiros funcionando'));

// ?? Autenticación básica (Devuelve un token)
app.post('/login', (req, res) => {
    const { usuarioId } = req.body;
    if (!usuarioId) return res.status(400).json({ error: "Se requiere usuarioId" });

    const token = jwt.sign({ usuarioId }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});

// ?? Registrar retiro (Protegido)
app.post('/retiros', auth, async (req, res) => {
    try {
        const { monto, numeroNequi } = req.body;
        if (!monto || monto <= 0 || !numeroNequi) {
            return res.status(400).json({ error: "Datos inválidos" });
        }

        const nuevoRetiro = new Retiro({ usuarioId: req.usuario.usuarioId, monto, numeroNequi });
        await nuevoRetiro.save();
        res.status(201).json({ mensaje: "? Retiro registrado", retiro: nuevoRetiro });

    } catch (error) {
        console.error("? Error:", error.message);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// ?? Procesar retiro con ePayco
app.post('/procesar-retiro', auth, async (req, res) => {
    const { retiroId } = req.body;

    try {
        const retiro = await Retiro.findById(retiroId);
        if (!retiro || retiro.estado !== 'pendiente') {
            return res.status(400).json({ error: "Retiro inválido o ya procesado" });
        }

        // ? Simulación del pago con ePayco
        const pago = await ePayco.bank.create({
            bank: 'Nequi',
            invoice: retiro._id.toString(),
            description: 'Retiro a Nequi',
            value: retiro.monto.toString(),
            tax: '0',
            tax_base: retiro.monto.toString(),
            currency: 'COP',
            type_person: '0',
            doc_type: 'CC',
            doc_number: '123456789',
            name: 'Usuario',
            last_name: 'Credican',
            email: 'usuario@example.com',
            country: 'CO',
            cell_phone: retiro.numeroNequi,
            url_response: 'https://tuservidor.com/respuesta',
            url_confirmation: 'https://tuservidor.com/confirmacion',
            method_confirmation: 'POST'
        });

        retiro.estado = 'aprobado';
        await retiro.save();
        res.json({ mensaje: "? Retiro procesado con éxito", pago });

    } catch (error) {
        console.error("? Error en el retiro:", error);
        res.status(500).json({ error: "Error al procesar el retiro con ePayco" });
    }
});

// ?? Obtener retiros del usuario autenticado
app.get('/retiros', auth, async (req, res) => {
    try {
        const retiros = await Retiro.find({ usuarioId: req.usuario.usuarioId });
        res.json(retiros);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener retiros" });
    }
});

// ? Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`? Servidor en http://localhost:${PORT}`));
