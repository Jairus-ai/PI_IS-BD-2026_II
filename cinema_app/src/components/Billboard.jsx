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
    )
}

export default Billboard