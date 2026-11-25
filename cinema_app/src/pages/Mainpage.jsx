import Footer from '../components/Footer.jsx'
import MovieCarousel from '../modules/billboard/components/MovieCarousel'
import BillboardGrid from '../modules/billboard/components/BillboardGrid'
import DashboardLayout from '../components/layout/DashboardLayout';

function Mainpage() {
  return(
    <>
    <DashboardLayout />
      <div id = "mainPageBody">
        <MovieCarousel />
        <BillboardGrid />
      </div>
      <Footer />
    </>
  )
}

export default Mainpage