import React, { useState } from 'react';
import { useDiscounts } from '../hooks/useDiscounts';

export const DiscountsPage = () => {
  const {
    discounts,
    isLoadingDiscounts,
    isdiscountsError,
    error,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    isSaving,
    isDeleting
  } = useDiscounts();

  const [formData, setFormData] = useState({ id: null, name: '', porcentage: '' });
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateDiscount(formData, { onSuccess: resetForm });
    } else {
      createDiscount(formData, { onSuccess: resetForm });
    }
  };

  const handleEditClick = (discount) => {
    setFormData(discount);
    setIsEditing(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('¿Está seguro que desea eliminar este descuento?')) {
      deleteDiscount(id);
    }
  };

  const resetForm = () => {
    setFormData({ id: null, name: '', porcentage: '' });
    setIsEditing(false);
  };

  if (isLoadingDiscounts) return <div>Cargando películas...</div>;
  if (isdiscountsError) return <div>Error al cargar películas: {error.message}</div>;

  return (
    <div>
      <h2>Discounts</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Porcentaje"
          value={formData.genre}
          onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
          required
        />
        <button type="submit" disabled={isSaving}>
          {isEditing ? 'Actualizar' : 'Guardar'}
        </button>
        {isEditing && <button type="button" onClick={resetForm}>Cancelar</button>}
      </form>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Porcentaje</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {discounts?.map((discount) => (
            <tr key={discount.id}>
              <td>{discount.name}</td>
              <td>{discount.porcentage}</td>
              <td>
                <button onClick={() => handleEditClick(discount)}>Editar</button>
                <button
                  onClick={() => handleDeleteClick(discount.id)}
                  disabled={isDeleting}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};