import React, { useState } from 'react';
import { useMovies } from '../hooks/useMovies';

export const MoviesPage = () => {
  const {
    movies,
    isLoading,
    isError,
    error,
    createMovie,
    updateMovie,
    deleteMovie,
    isSaving,
    isDeleting
  } = useMovies();

  const [formData, setFormData] = useState({ id: null, title: '', genre: '', year: '' });
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateMovie(formData, { onSuccess: resetForm });
    } else {
      createMovie(formData, { onSuccess: resetForm });
    }
  };

  const handleEditClick = (movie) => {
    setFormData(movie);
    setIsEditing(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('¿Está seguro que desea eliminar esta película?')) {
      deleteMovie(id);
    }
  };

  const resetForm = () => {
    setFormData({ id: null, title: '', genre: '', year: '' });
    setIsEditing(false);
  };

  if (isLoading) return <div>Cargando películas...</div>;
  if (isError) return <div>Error al cargar películas: {error.message}</div>;

  return (
    <div>
      <h2>Películas</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Título"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Género"
          value={formData.genre}
          onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Año"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
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
            <th>Título</th>
            <th>Género</th>
            <th>Año</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {movies?.map((movie) => (
            <tr key={movie.id}>
              <td>{movie.title}</td>
              <td>{movie.genre}</td>
              <td>{movie.year}</td>
              <td>
                <button onClick={() => handleEditClick(movie)}>Editar</button>
                <button
                  onClick={() => handleDeleteClick(movie.id)}
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