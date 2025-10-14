// src/pages/Ventas/components/BuscadorProductos.js
import React, { useState, useMemo, useRef } from 'react';
import useDebounce from '../hooks/useDebounce'; // Asumiendo que mueves el hook a su propia carpeta
import styles from '../Ventas.module.css';

const formatearGs = (valor) => Number(valor).toLocaleString('es-PY');

function BuscadorProductos({ productos, onAddProducto }) {
    const [busqueda, setBusqueda] = useState('');
    const [selected, setSelected] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const debouncedBusqueda = useDebounce(busqueda, 300);
    const inputRef = useRef(null);

    const productosFiltrados = useMemo(() =>
        productos.filter(p => p.nombre.toLowerCase().includes(debouncedBusqueda.toLowerCase())),
        [debouncedBusqueda, productos]
    );

    const handleSelect = (prod) => {
        setSelected(prod);
        setBusqueda(`${prod.nombre} - Gs. ${formatearGs(prod.precio)}`);
        setCantidad(1);
    };

    const handleAdd = () => {
        if (!selected) return;
        onAddProducto(selected, cantidad);
        // Resetear para siguiente producto
        setBusqueda('');
        setSelected(null);
        setCantidad(1);
        inputRef.current?.focus();
    };

    return (
        <section className={styles.card}>
            <h2 className={styles.cardTitle}>Buscar Producto</h2>
            <div className={styles.inputWithIcon}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ingrese nombre del producto"
                    value={busqueda}
                    onChange={(e) => {
                        setBusqueda(e.target.value);
                        setSelected(null);
                    }}
                    className={styles.inputField}
                />
                <span className={styles.inputIcon}>🔍</span>
            </div>

            {debouncedBusqueda && !selected && (
                <ul className={styles.searchResultsList}>
                    {productosFiltrados.length > 0 ? (
                        productosFiltrados.map((prod) => (
                            <li key={prod.id} onClick={() => handleSelect(prod)} className={styles.searchResultItem}>
                                <span className={styles.productName}>{prod.nombre}</span>
                                <span className={styles.productPrice}>Gs. {formatearGs(prod.precio)}</span>
                                <span className={styles.productStock}>Stock: {prod.stock}</span>
                            </li>
                        ))
                    ) : <p className={styles.noResults}>No se encontró el producto.</p>}
                </ul>
            )}

            {selected && (
                <div className={styles.selectedProductControls}>
                     <p>Producto: <strong className={styles.selectedProductName}>{selected.nombre}</strong></p>
                     <div className={styles.quantityControl}>
                        <label>Cantidad:</label>
                        <input
                            type="number"
                            value={cantidad}
                            onChange={(e) => setCantidad(e.target.value)}
                            className={styles.quantityInput}
                            min="1"
                        />
                        <button onClick={handleAdd} className={styles.addButton}>Agregar</button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default React.memo(BuscadorProductos);