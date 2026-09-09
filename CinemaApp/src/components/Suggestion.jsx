import movieSugestion from '../assets/bannerPlaceHolder.jpg'

function Sugestions()
{
    return(
        <div id = "suggestions">
            <img id = "movieSuggestionImage" src={movieSugestion} alt="suggestions" />
        </div>
    )
}

export default Sugestions