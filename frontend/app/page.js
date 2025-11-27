import UpcomingEvents from "@/components/home-page/featured-events";
import Hero from "@/components/home-page/hero-page";
import EventCreation from "@/components/home-page/event-creation";
import TopClubsAndCampuses from "@/components/home-page/top-club";

export default function Home() {
  return (
    <>
      <Hero />
      <UpcomingEvents />
      <EventCreation />
      <TopClubsAndCampuses />
    </>
  );
}
