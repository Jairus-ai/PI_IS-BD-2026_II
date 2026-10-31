import Footer from '../components/Footer.jsx'
import Sugestions from '../components/Suggestion.jsx'
import Billboard from '../components/Billboard.jsx'
import DashboardLayout from '../components/layout/DashboardLayout';

function Mainpage() {
  return(
    <>
    <DashboardLayout/>
      <div id = "mainPageBody">
        <Sugestions />
        <Billboard />
      </div>
      <Footer />
    </>
  )
}

export default Mainpage