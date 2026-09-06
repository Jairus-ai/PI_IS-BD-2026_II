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
                    <p>Sobre Nosotros</p>
                    <hr/>
                </div>
                <ul id="sobreNosotrosList">
                    <li>Historia</li>
                    <li>Misión</li>
                    <li>Visión</li>
                </ul>
            </div>

            <div id = "contacto">
                <div id = "contactoTitle">
                    <p>Contacto</p>
                    <hr/>
                </div>
                <ul id = "contactoList">
                    <li>Correo</li>
                    <li>Facebook</li>
                    <li>Número de telefono</li>
                </ul>
            </div>
        </footer>
    )
}

export default Footer