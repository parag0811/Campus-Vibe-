import UpcomingEvents from "@/components/home-page/featured-events";
import Hero from "@/components/home-page/hero-page";
import EventCreation from "@/components/home-page/event-creation";
import ShareExperiences from "@/components/home-page/share-exp";

export default function Home() {
  return (
    <>
        <Hero />
        <UpcomingEvents />
        <EventCreation />
        <ShareExperiences />
    </>
  );
}
