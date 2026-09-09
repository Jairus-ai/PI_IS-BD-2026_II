import logo from '../assets/logoPlaceHolder.png'

function NavBar()
{
    return(
        <div id = "navigationBar">
            <img id = "logoImageNavBar" src={logo} alt="logo" />
            <p id = "logInButton" className='detailTextBold'>Iniciar Sesión</p>
        </div>
    )
}

export default NavBar