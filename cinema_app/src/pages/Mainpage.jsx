import Footer from '../components/Footer.jsx'
import MovieCarousel from '../modules/billboard/components/MovieCarousel'
import Billboard from '../components/Billboard.jsx'
import DashboardLayout from '../components/layout/DashboardLayout';

function Mainpage() {
  return(
    <>
    <DashboardLayout />
      <div id = "mainPageBody">
        <MovieCarousel />
        <Billboard />
      </div>
      <Footer />
    </>
  )
}

export default Mainpage