import { Link } from 'react-router'
import logo from '../assets/logo.png'
import useSession from '../hooks/useSession'

function NavBar()
{
    const { user, isLoggedIn } = useSession()

    return(
        <div id = "navigationBar">
            <img id = "logoImageNavBar" src={logo} alt="logo" />
            {isLoggedIn ? (
                <p id = "welcomeMessage" className='detailTextBold'>Bienvenido, {user.firstName}</p>
            ) : (
                <div id = "sessionButtons">
                    <p id = "logInButton" className='detailTextBold'>Iniciar Sesión</p>
                    <Link id = "signUpButton" className='detailTextBold' to="/register">Registrarse</Link>
                </div>
            )}
        </div>
    )
}

export default NavBar
