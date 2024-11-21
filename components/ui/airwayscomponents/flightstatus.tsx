import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Plane, Clock, DoorClosed, Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LDClient, useFlags } from "launchdarkly-react-client-sdk";
import { useEffect } from "react";
import { useLDClient } from "launchdarkly-react-client-sdk";

const fakeFlightData = [
  {
    id: 1,
    flightNumber: "LA123",
    from: "LAX",
    fromCity: "Los Angeles",
    to: "JFK",
    toCity: "New York",
    status: "On Time",
    departureTime: "10:30 AM",
    arrivalTime: "6:45 PM",
    gate: "A22",
  },
  {
    id: 2,
    flightNumber: "LA456",
    from: "SFO",
    fromCity: "San Francisco",
    to: "ORD",
    toCity: "Chicago",
    status: "Delayed",
    departureTime: "2:15 PM",
    arrivalTime: "8:30 PM",
    gate: "B15",
  },
  {
    id: 3,
    flightNumber: "LA789",
    from: "SEA",
    fromCity: "Seattle",
    to: "MIA",
    toCity: "Miami",
    status: "Boarding",
    departureTime: "11:45 AM",
    arrivalTime: "8:00 PM",
    gate: "C07",
  },
];

export default function FlightStatus() {
  const [flightData] = useState(fakeFlightData);
  const [error, setError] = useState(false);
  const { flightStatus } = useFlags();

  const ldClient = useLDClient();

  useEffect(() => {
    

    const trackLatencyAndBooking = async () => {
      // Random latency between 150-180ms
      const latency = Math.floor(Math.random() * (180 - 150 + 1)) + 150;
      
      // Track latency metric
      await ldClient?.track('flight-status-latency', null, latency);

      // 70% chance to track a booking
      if (Math.random() < 0.7) {
        await ldClient?.track('airline-booking');
      }

      await ldClient?.flush();
    };

    trackLatencyAndBooking();
  }, [ldClient]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.5,
      },
    },
  };

  const childVariants = {
    hidden: { x: -300, opacity: 0 },
    show: { x: 0, opacity: 1 },
    exit: { x: 300, opacity: 0 },
  };

  const navLinkStyling =
    "lg:pb-[3rem] lg:mr-4 flex items-start text-sm font-sohnelight font-medium lg:transition-colors lg:bg-no-repeat lg:bg-bottom lg:bg-transparent";

  const ErrorDisplay = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h3>
      <p className="text-gray-600 mb-6">Could not connect to the status page. Please try again later.</p>
      <Button 
        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6"
        onClick={() => setError(false)}
      >
        Retry Connection
      </Button>
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={`${navLinkStyling} relative lg:hover:bg-gradient-airline-buttons bg-[length:100%_3px] cursor-pointer animate-pulse hover:animate-none`}
        >
          <div className="block sm:hidden lg:block cursor-pointer sm:text-airlineinactive sm:focus:text-airlinetext sm:hover:text-white">
            <span className="">Flight Status</span>
          </div>
          <div className="hidden sm:block lg:hidden relative">
            <Plane className="text-block sm:text-white" />
          </div>
        </button>
      </SheetTrigger>
      <SheetContent
        className="p-4 sm:p-8 w-full lg:w-3/4 xl:w-1/2 overflow-y-scroll bg-gray-50"
        side="right"
      >
        <SheetHeader className="mb-8">
          <SheetTitle className="font-sohne text-4xl font-bold text-gray-900">
            Flight Status
          </SheetTitle>
        </SheetHeader>

        {flightStatus || error ? (
          <ErrorDisplay />
        ) : (
          <motion.div
            className="w-full flex flex-col gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {flightData.map((flight) => (
                <motion.div
                  key={flight.id}
                  variants={childVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardContent className="p-0">
                      <div className="bg-white p-6">
                        {/* Flight Number and Route */}
                        <div className="flex flex-col space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                              Flight {flight.flightNumber}
                            </span>
                            <div className="flex items-center space-x-3">
                              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                flight.status === 'On Time' 
                                  ? 'bg-green-50 text-green-600' 
                                  : flight.status === 'Delayed' 
                                  ? 'bg-red-50 text-red-600' 
                                  : 'bg-blue-50 text-blue-600'
                              }`}>
                                {flight.status}
                              </span>
                            </div>
                          </div>

                          {/* Cities */}
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <p className="text-2xl font-bold text-gray-900">{flight.fromCity}</p>
                              <p className="text-sm text-gray-500">{flight.from}</p>
                            </div>
                            <ArrowRight className="text-gray-400 mx-4" size={24} />
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{flight.toCity}</p>
                              <p className="text-sm text-gray-500">{flight.to}</p>
                            </div>
                          </div>

                          {/* Flight Details */}
                          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-2">
                              <Clock className="text-gray-400" size={16} />
                              <div>
                                <p className="text-xs text-gray-500">Departure</p>
                                <p className="text-sm font-medium">{flight.departureTime}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="text-gray-400" size={16} />
                              <div>
                                <p className="text-xs text-gray-500">Arrival</p>
                                <p className="text-sm font-medium">{flight.arrivalTime}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DoorClosed className="text-gray-400" size={16} />
                              <div>
                                <p className="text-xs text-gray-500">Gate</p>
                                <p className="text-sm font-medium">{flight.gate}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* View Details Button */}
                        <div className="mt-6">
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 flex items-center justify-center space-x-2"
                          >
                            <Info size={16} />
                            <span>View Flight Details</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
