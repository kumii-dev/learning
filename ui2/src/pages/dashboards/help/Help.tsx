import LazyWrapper from "@/components/LazyWrapper";
import Breadcrumb from "@/layouts/Breadcrumb";
import HorizontalBarChart from "@/pages/chart/line-chart/HorizontalBarChart";
import { lazy } from "react";
import PendingSolvedTicketsCard from "./components/PendingSolvedTicketsCard";
import PerformanceAgentsCard from "./components/PerformanceAgentsCard";
import ResponseTimeCard from "./components/ResponseTimeCard";
import TicketStatusCard from "./components/TicketStatusCard";
import TodoListCard from "./components/TodoListCard";
import TopPodcasterCard from "./components/TopPodcasterCard";
const TaskSummaryCard = lazy(() => import("./components/TaskSummaryCard"))

const Help = () => {
    return (
        <>
            <Breadcrumb title="Help Desk" text="Help Desk" />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                    <LazyWrapper>
                        <TaskSummaryCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <LazyWrapper>
                        <div className="shadow-7 p-5 rounded-xl bg-white dark:bg-[#273142] h-full">
                            <div className="flex items-center flex-wrap gap-2 justify-between">
                                <h6 className="mb-0 font-bold text-lg">Ticket Priority</h6>
                            </div>
                            <div className="relative text-style label-bold">
                                <LazyWrapper>
                                    <HorizontalBarChart />
                                </LazyWrapper>
                            </div>
                        </div>
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <LazyWrapper>
                        <TicketStatusCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <LazyWrapper>
                        <PendingSolvedTicketsCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <LazyWrapper>
                        <TodoListCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <LazyWrapper>
                        <TopPodcasterCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <LazyWrapper>
                        <PerformanceAgentsCard />
                    </LazyWrapper>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <LazyWrapper>
                        <ResponseTimeCard />
                    </LazyWrapper>
                </div>
            </div>

        </>
    );
};

export default Help;