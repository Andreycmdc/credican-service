require('dotenv').config(); // ?? Correcci�n aqu�

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const ePayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY || '',
    privateKey: process.env.EPAYCO_PRIVATE_KEY || '',
    lang: 'ES',
    test: true // Cambia a false en producci�n
});

const app = express();
app.use(express.json());
app.use(cors());

// ?? Conexi�n a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('? Conectado a MongoDB Atlas'))
.catch(err => console.error('? Error al conectar a MongoDB:', err));

// ?? Modelo de Retiros
const RetiroSchema = new mongoose.Schema({
    usuarioId: { type: String, required: true },
    monto: { type: Number, required: true, min: 1 },
    metodoPago: { type: String, enum: ['Nequi', 'Bancolombia', 'Daviplata'], required: true },
    numeroCuenta: { type: String, required: true },
    tipoDocumento: { type: String, enum: ['CC', 'TI', 'CE'], required: true },
    numeroDocumento: { type: String, required: true },
    estado: { type: String, default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

const Retiro = mongoose.model('Retiro', RetiroSchema);

// ?? Ruta de bienvenida
app.get('/', (req, res) => {
    res.send('Bienvenido a la API de Credican');
});

// ?? Ruta para solicitar un retiro
app.post('/retiros', async (req, res) => {
    const { usuarioId, monto, metodoPago, numeroCuenta, tipoDocumento, numeroDocumento } = req.body;

    try {
        const nuevoRetiro = new Retiro({ usuarioId, monto, metodoPago, numeroCuenta, tipoDocumento, numeroDocumento });
        await nuevoRetiro.save();
        res.status(201).json({ mensaje: '? Solicitud de retiro registrada con �xito', retiro: nuevoRetiro });
    } catch (error) {
        console.error('? Error al registrar el retiro:', error);
        res.status(500).json({ error: 'Error al registrar el retiro' });
    }
});

// ?? Ruta para procesar retiro con ePayco
app.post('/procesar-retiro', async (req, res) => {
    const { retiroId } = req.body;

    try {
        const retiro = await Retiro.findById(retiroId);
        if (!retiro || retiro.estado !== 'pendiente') {
            return res.status(400).json({ error: '? Retiro inv�lido o ya procesado' });
        }

        // ?? Procesar retiro con ePayco
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
        res.json({ mensaje: '? Retiro aprobado y procesado con �xito', pago });

    } catch (error) {
        console.error('? Error en el retiro:', error);
        res.status(500).json({ error: 'Error al procesar el retiro con ePayco' });
    }
});

// ?? Ruta para ver retiros
app.get('/retiros', async (req, res) => {
    try {
        const retiros = await Retiro.find();
        res.json(retiros);
    } catch (error) {
        console.error('? Error al obtener retiros:', error);
        res.status(500).json({ error: 'Error al obtener retiros' });
    }
});

// ?? Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('? Error:', err.stack);
    res.status(500).json({ error: 'Ocurri� un error en el servidor' });
});

// ?? Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`? Servidor en ejecuci�n en http://localhost:${PORT}`);
});
