import Footer from '../components/Footer.jsx'
import NavBar from '../components/NavBar.jsx'
import Sugestions from '../components/Suggestion.jsx'
import Billboard from '../components/Billboard.jsx'

function Mainpage()
{
    return(
        <>
            <NavBar />
            <div id = "mainPageBody">
                <Sugestions />
                <Billboard />
            </div>
            <Footer />
        </>
    )
}

export default Mainpage