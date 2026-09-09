import movie1 from '../assets/movie1Example.jpg'
import movie2 from '../assets/movie2Example.jfif'
import movie3 from '../assets/movie3Example.webp'
import leftArrow from '../assets/arrow1.webp'
import rightArrow from '../assets/arrow.webp'

function Billboard()
{
    return(
        <div id = "billboard">
            <div>
                <p className='titleTextBold'>Cartelera</p>
            </div>
            <div id = "billboardHolders">
                <img className='arrow' src={leftArrow} alt="" />
                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie1" src={movie1} alt="movie1" />
                    <p className='subtitleTextBold'>Spider Man</p>
                    <p className='smallDetailText'>Han pasado cuatro años desde los acontecimientos de No Way Home, y Peter Parker ahora es un adulto que vive completamente solo, ha desaparecido voluntariamente de las vidas y recuerdos de quienes ama. Combatiendo el crimen en una Nueva York que ya no conoce su nombre, se ha dedicado por completo a proteger su ciudad—un Spider-Man a tiempo completo—, pero a medida que aumentan las exigencias sobre él, la presión desencadena una evolución física que amenaza su existencia, al mismo tiempo que un extraño nuevo patrón de crímenes da lugar a una de las amenazas más poderosas a las que se ha enfrentado.</p>
                </div>

                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie2" src={movie2} alt="movie1" />
                    <p className='subtitleTextBold'>Paw Patrol</p>
                    <p className='smallDetailText'>Después de que el barco quede atrapado en una misteriosa tormenta, los cachorros de Paw Patrol naufragan en una isla tropical inexplorada repleta de dinosaurios. Allí conocen a Rex, un cachorro que lleva años varado en la isla y que se ha convertido en un auténtico experto en todo lo relacionado con los dinos. Cuando el archienemigo de Paw Patrol, el alcalde Humdinger, comienza a explotar la isla de forma imprudente con la intención de aprovechar sus recursos naturales, provoca accidentalmente la erupción de un enorme volcán inactivo.</p>
                </div>

                <div className='billboardHolder'>
                    <img className = 'moviePoster' id = "movie3" src={movie3} alt="movie1" />
                    <p className='subtitleTextBold'>Transformers</p>
                    <p className='smallDetailText'>Los Autobots deben detener a un colosal robot consumidor de planetas que persigue la Matriz de Liderazgo Autobot. Al mismo tiempo, deben defenderse de un ataque total de los Decepticons.</p>
                </div>
                <img className='arrow' src={rightArrow} alt="" />
            </div>
        </div>
    )
}

export default Billboard