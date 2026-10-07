import { Link } from 'react-router'
import logo from '../assets/logo.png'
import useSession from '../hooks/useSession'
import LogOutButton from './common/LogOutButton'

function NavBar()
{
    const { user, isLoggedIn } = useSession()

    return(
        <div id = "navigationBar">
            <img id = "logoImageNavBar" src={logo} alt="logo" />
            {isLoggedIn ? (
                <div id = "sessionButtons">
                    <p id = "welcomeMessage" className='detailTextBold'>Bienvenido, {user.firstName}</p>
                    <LogOutButton id = "logOutButton" color = "inherit" />
                </div>
            ) : (
                <div id = "sessionButtons">
                    <Link id = "logInButton" className='detailTextBold' to="/login">Iniciar Sesión</Link>
                    <Link id = "signUpButton" className='detailTextBold' to="/register">Registrarse</Link>
                </div>
            )}
        </div>
    )
}

export default NavBar
