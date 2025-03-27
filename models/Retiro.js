const mongoose = require('mongoose');

const RetiroSchema = new mongoose.Schema({
    usuarioId: { type: String, required: true },
    monto: { type: Number, required: true },
    numeroNequi: { type: String, required: true },
    estado: { type: String, enum: ['pendiente', 'aprobado', 'fallido'], default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Retiro', RetiroSchema);
