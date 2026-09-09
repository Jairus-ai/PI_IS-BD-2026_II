import logo from '../assets/logoPlaceHolder.png'

function Footer()
{
    return(
        <footer>
            <div id = "logo">
                <img id = "logoImage" src={logo} alt="LOGO" />
            </div>

            <div id = "sobreNosotros">
                <div id = "sobreNosotrosTitle">
                    <p className='subtitleTextBold'>Sobre Nosotros</p>
                    <hr/>
                </div>
                <ul id="sobreNosotrosList">
                    <li className='detailText'>Historia</li>
                    <li className='detailText'>Misión</li>
                    <li className='detailText'>Visión</li>
                </ul>
            </div>

            <div id = "contacto">
                <div id = "contactoTitle">
                    <p className='subtitleTextBold'>Contacto</p>
                    <hr/>
                </div>
                <ul id = "contactoList">
                    <li className='detailText'>Correo</li>
                    <li className='detailText'>Facebook</li>
                    <li className='detailText'>Número de telefono</li>
                </ul>
            </div>
        </footer>
    )
}

export default Footer