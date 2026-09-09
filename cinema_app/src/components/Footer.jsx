import logo from '../assets/logo.png'

function Footer()
{
    return(
        <footer>
            <div id = "logo">
                <img id = "logoImage" src={logo} alt="LOGO" />
            </div>

            <div id = "sobreNosotros">
                <div id = "sobreNosotrosTitle">
                    <p className='smallDetailTextBold'>Sobre Nosotros</p>
                    <hr/>
                </div>
                <ul id="sobreNosotrosList">
                    <li className='smallDetailText'>Historia</li>
                    <li className='smallDetailText'>Misión</li>
                    <li className='smallDetailText'>Visión</li>
                </ul>
            </div>

            <div id = "contacto">
                <div id = "contactoTitle">
                    <p className='smallDetailTextBold'>Contacto</p>
                    <hr/>
                </div>
                <ul id = "contactoList">
                    <li className='smallDetailText'>Correo</li>
                    <li className='smallDetailText'>Facebook</li>
                    <li className='smallDetailText'>Número de teléfono</li>
                </ul>
            </div>
        </footer>
    )
}

export default Footer