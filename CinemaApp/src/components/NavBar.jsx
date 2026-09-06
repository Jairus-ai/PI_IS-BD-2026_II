import logo from '../assets/logoPlaceHolder.png'

function NavBar()
{
    return(
        <div id = "navigationBar">
            <img id = "logoImageNavBar" src={logo} alt="logo" />
        </div>
    )
}

export default NavBar