import Footer from '../components/Footer.jsx'
import NavBar from '../components/NavBar.jsx'
import movie1 from '../assets/movie1Example.jpg'
import movie2 from '../assets/movie2Example.jfif'
import movie3 from '../assets/movie3Example.webp'
import movieSugestion from '../assets/bannerPlaceHolder.jpg'

function Mainpage()
{
    return(
        <>
            <NavBar />
            <div id = "mainPageBody">
                <div id = "suggestions">
                    <img id = "movieSugestionImage" src={movieSugestion} alt="suggestions" />
                </div>
                <div id = "billboard">
                    <img className = "moviePoster" id = "movie1" src={movie1} alt="movie1" />
                    <img className = "moviePoster" id = "movie2" src={movie2} alt="movie1" />
                    <img className = "moviePoster" id = "movie3" src={movie3} alt="movie1" />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default Mainpage