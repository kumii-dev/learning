import LazyWrapper from "@/components/LazyWrapper";
import Breadcrumb from "@/layouts/Breadcrumb";
// import CountriesStatusCard from "../crm/components/CountriesStatusCard";
// import AudienceStatsCard from "./components/AudienceStatsCard";
// import PodcastEarningsOverviewCard from "./components/PodcastEarningsOverviewCard";
// import PodcastTopCategoriesCard from "./components/PodcastTopCategoriesCard";
// import RecentlyPlayedCard from "./components/RecentlyPlayedCard";
// import RecentPurposePlanCard from "./components/RecentPurposePlanCard";
// import TopPodcasterCard from "./components/TopPodcasterCard";
import CountriesStatusCard from "../crm/components/CountriesStatusCard";
import AudienceStatsCard from "./components/AudienceStatsCard";
import PodcastEarningsOverviewCard from "./components/PodcastEarningsOverviewCard";
import PodcastTopCategoriesCard from "./components/PodcastTopCategoriesCard";
import RecentlyPlayedCard from "./components/RecentlyPlayedCard";
import RecentPurposePlanCard from "./components/RecentPurposePlanCard";
import TopPodcasterCard from "./components/TopPodcasterCard";
import TotalPodcasts from "./components/TotalPodcasts";
import TotalUsers from "./components/TotalUsers";
import TrendingEpisodesCard from "./components/TrendingEpisodesCard";
// import TrendingEpisodesCard from "./components/TrendingEpisodesCard";

const Podcast = () => {
    return (
        <>
            <Breadcrumb title="Podcast" text="Podcast" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-5 2xl:col-span-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-6 lg:col-span-12">
                            <LazyWrapper>
                                <TotalUsers />
                            </LazyWrapper>
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-12">
                            <LazyWrapper>
                                <TotalPodcasts />
                            </LazyWrapper>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-7 2xl:col-span-8">
                    <LazyWrapper>
                        <AudienceStatsCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <LazyWrapper>
                        <PodcastEarningsOverviewCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <LazyWrapper>
                        <RecentlyPlayedCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 2xl:col-span-8">
                    <LazyWrapper>
                        <RecentPurposePlanCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 md:col-span-6 2xl:col-span-4">
                    <LazyWrapper>
                        <CountriesStatusCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 md:col-span-6 2xl:col-span-4">
                    <LazyWrapper>
                        <TrendingEpisodesCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 md:col-span-6 2xl:col-span-4">
                    <LazyWrapper>
                        <PodcastTopCategoriesCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 md:col-span-6 2xl:col-span-4">
                    <LazyWrapper>
                        <TopPodcasterCard />
                    </LazyWrapper>
                </div>

            </div>
        </>
    );
};

export default Podcast;