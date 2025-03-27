require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const auth = require('./auth');
const Retiro = require('./Retiro');

const ePayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY || '',
    privateKey: process.env.EPAYCO_PRIVATE_KEY || '',
    lang: 'ES',
    test: true
});

const app = express();
app.use(express.json());
app.use(cors());

// ? Conexión a MongoDB con manejo de errores
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('? Conectado a MongoDB Atlas'))
.catch(err => {
    console.error('? Error al conectar a MongoDB:', err.message);
    process.exit(1);
});

// ? Ruta de bienvenida
app.get('/', (req, res) => {
    res.send('Bienvenido a la API de retiros');
});

// ? Ruta para solicitar un retiro (protegida con autenticación)
app.post('/retiros', auth, async (req, res) => {
    try {
        const { usuarioId, monto, metodoPago, numeroCuenta, tipoDocumento, numeroDocumento } = req.body;

        if (!usuarioId || !monto || !metodoPago || !numeroCuenta || !tipoDocumento || !numeroDocumento) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        if (monto <= 0) {
            return res.status(400).json({ error: "El monto debe ser mayor a 0" });
        }

        const nuevoRetiro = new Retiro({ usuarioId, monto, metodoPago, numeroCuenta, tipoDocumento, numeroDocumento });
        await nuevoRetiro.save();
        res.status(201).json({ mensaje: "? Retiro registrado con éxito", retiro: nuevoRetiro });

    } catch (error) {
        console.error('? Error al registrar el retiro:', error.message);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// ? Ruta para procesar retiro con ePayco
app.post('/procesar-retiro', auth, async (req, res) => {
    const { retiroId } = req.body;

    try {
        const retiro = await Retiro.findById(retiroId);
        if (!retiro || retiro.estado !== 'pendiente') {
            return res.status(400).json({ error: "Retiro inválido o ya procesado" });
        }

        // Procesar retiro con ePayco
        const pago = await ePayco.bank.create({
            bank: retiro.metodoPago === 'Nequi' ? 'Nequi' : '1022',
            invoice: retiro._id.toString(),
            description: 'Retiro Credican',
            value: retiro.monto.toString(),
            tax: '0',
            tax_base: retiro.monto.toString(),
            currency: 'COP',
            type_person: '0',
            doc_type: retiro.tipoDocumento,
            doc_number: retiro.numeroDocumento,
            name: 'Usuario',
            last_name: 'Credican',
            email: 'usuario@example.com',
            country: 'CO',
            cell_phone: retiro.numeroCuenta,
            url_response: 'https://tuservidor.com/respuesta',
            url_confirmation: 'https://tuservidor.com/confirmacion',
            method_confirmation: 'POST'
        });

        retiro.estado = 'aprobado';
        await retiro.save();
        res.json({ mensaje: "? Retiro procesado con éxito", pago });

    } catch (error) {
        console.error('? Error en el retiro:', error);
        res.status(500).json({ error: "Error al procesar el retiro con ePayco" });
    }
});

// ? Ruta para obtener todos los retiros
app.get('/retiros', auth, async (req, res) => {
    try {
        const retiros = await Retiro.find();
        res.json(retiros);
    } catch (error) {
        console.error('? Error al obtener retiros:', error);
        res.status(500).json({ error: "Error al obtener retiros" });
    }
});

// ? Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('? Error:', err.stack);
    res.status(500).json({ error: "Ocurrió un error en el servidor" });
});

// ? Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`?? Servidor en ejecución en http://localhost:${PORT}`);
});
