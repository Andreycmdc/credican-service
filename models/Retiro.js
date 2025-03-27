const mongoose = require('mongoose');

const retiroSchema = new mongoose.Schema({
    usuarioId: String,
    monto: Number,
    estado: { type: String, default: 'pendiente' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Retiro', retiroSchema);
