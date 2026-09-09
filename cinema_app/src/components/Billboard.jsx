import movie1 from '../assets/movie1Example.jpg'
import movie2 from '../assets/movie2Example.jfif'
import movie3 from '../assets/movie3Example.webp'
import leftArrow from '../assets/arrow1.webp'
import rightArrow from '../assets/arrow.webp'

function Billboard()
{
    const movies = [
      {
        id: 1,
        title: "Spider-Man: Un nuevo día",
        genre: "Acción / Ciencia Ficción",
        duration: "145 min",
        rating: "PG-12",
        synopsis: "Han pasado cuatro años desde los acontecimientos de No Way Home, y Peter Parker ahora es un adulto que vive completamente solo, ha desaparecido.",
        image: movie1
      },
      {
        id: 2,
        title: "Paw Patrol: La Dino película",
        genre: "Animación / Comedia",
        duration: "86 min",
        rating: "TP",
        synopsis: "Un meteorito mágico aterriza en Adventure City y le da a los cachorros de PAW Patrol súper poderes insólitos.",
        image: movie2
      },
      {
        id: 3,
        title: "Transformers: 40 Aniversario",
        genre: "Animación",
        duration: "127 min",
        rating: "TP",
        synopsis: "Optimus Prime y los Autobots luchan contra una nueva amenaza capaz de destruir el planeta entero.",
        image: movie3
      }
    ]
    
    {/*return(
        <div id = "billboard">
            <div>
                <p className='titleTextBold'>Cartelera</p>
            </div>
            <div id = "billboardHolders">
                <img className='arrow' src={leftArrow} alt="" />
                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie1" src={movie1} alt="movie1" />
                    <p className='subtitleTextBold'>Spider Man</p>
                </div>

                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie2" src={movie2} alt="movie1" />
                    <p className='subtitleTextBold'>Paw Patrol</p>
                </div>

                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie3" src={movie3} alt="movie1" />
                    <p className='subtitleTextBold'>Transformers</p>
                </div>
                <img className='arrow' src={rightArrow} alt="" />
            </div>
        </div>
    )*/}

    return (
    <div id="billboard">
      <div>
        <p className="titleTextBold">Cartelera</p>
      </div>

      <div id="billboardHolders">
        <img className="arrow" src={leftArrow} alt="Anterior" />

        {movies.map((movie) => (
          <div className="card" key={movie.id}>
            <div className="content">
              
              <div className="front">
                <img className="poster-img" src={movie.image} alt={movie.title} />
                <div className="front-content">
                  <span className="badge">{movie.rating}</span>
                  <div className="description">
                    <p className="movie-title-front">{movie.title}</p>
                    <p className="card-footer">{movie.genre}</p>
                  </div>
                </div>
              </div>

              <div className="back">
                <div className="back-content">
                  <h4>{movie.title}</h4>
                  <p><strong>Duración:</strong> {movie.duration}</p>
                  <p className="synopsis">{movie.synopsis}</p>
                  <p><strong>Genéro:</strong>{movie.genre}</p>
                </div>
              </div>

            </div>
          </div>
        ))}

        <img className="arrow" src={rightArrow} alt="Siguiente" />
      </div>
    </div>
  )
}

export default Billboard