// src/pages/Ventas/hooks/useVentas.js
import { useState, useMemo, useCallback } from 'react';

export const useVentas = (productosDisponibles) => {
    const [detalles, setDetalles] = useState([]);
    const [cliente, setCliente] = useState(null);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [mensajeError, setMensajeError] = useState('');

    const addProducto = useCallback((producto, cantidad) => {
        const cant = Number(cantidad);
        if (isNaN(cant) || cant <= 0) {
            setMensajeError('La cantidad debe ser un número positivo.');
            return;
        }
        if (producto.stock < cant) {
            setMensajeError(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`);
            return;
        }

        const existingIndex = detalles.findIndex(item => item.producto_id === producto.id);

        if (existingIndex > -1) {
            setDetalles(prev => prev.map((item, index) => {
                if (index === existingIndex) {
                    const newCantidad = item.cantidad + cant;
                    if (producto.stock < newCantidad) {
                        setMensajeError(`Stock insuficiente. Disponible: ${producto.stock}`);
                        return item; // No actualiza si se excede el stock
                    }
                    return { ...item, cantidad: newCantidad, subtotal: item.precio_unitario * newCantidad };
                }
                return item;
            }));
        } else {
            setDetalles(prev => [...prev, {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: cant,
                precio_unitario: producto.precio,
                subtotal: producto.precio * cant,
            }]);
        }
        setMensajeError('');
    }, [detalles]);

    const removeProducto = useCallback((indexToRemove) => {
        setDetalles(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const editCantidadProducto = useCallback((indexToEdit, newQuantity) => {
        const cant = Number(newQuantity);
        if (isNaN(cant) || cant < 0) return; // Permitir 0 para luego borrar si se quiere

        if (cant === 0) {
            removeProducto(indexToEdit);
            return;
        }

        setDetalles(prev => prev.map((item, index) => {
            if (index === indexToEdit) {
                const productoOriginal = productosDisponibles.find(p => p.id === item.producto_id);
                if (productoOriginal.stock < cant) {
                    setMensajeError(`Stock insuficiente. Disponible: ${productoOriginal.stock}`);
                    return item; // No actualiza
                }
                return { ...item, cantidad: cant, subtotal: item.precio_unitario * cant };
            }
            return item;
        }));
    }, [productosDisponibles, removeProducto]);

    const totalVenta = useMemo(() =>
        detalles.reduce((acc, { subtotal }) => acc + subtotal, 0),
        [detalles]
    );

    const resetVenta = useCallback(() => {
        setDetalles([]);
        setCliente(null);
        setMetodoPago('efectivo');
        setMensajeError('');
    }, []);

    return {
        detalles,
        cliente,
        metodoPago,
        totalVenta,
        mensajeError,
        setCliente,
        setMetodoPago,
        addProducto,
        removeProducto,
        editCantidadProducto,
        resetVenta,
        setMensajeError,
    };
};