const mongoose = require('mongoose');

const retiroSchema = new mongoose.Schema({
    usuarioId: { type: String, required: true },
    monto: { type: Number, required: true, min: 1 },
    metodoPago: { type: String, enum: ['Nequi', 'Bancolombia', 'Daviplata'], required: true },
    numeroCuenta: { type: String, required: true },
    tipoDocumento: { type: String, enum: ['CC', 'TI', 'CE'], required: true },
    numeroDocumento: { type: String, required: true },
    estado: { type: String, default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Retiro', retiroSchema);
