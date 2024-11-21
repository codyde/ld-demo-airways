//@ts-nocheck
'use client'
import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TripsContext from "@/utils/contexts/TripContext";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useFlags, useLDClient } from "launchdarkly-react-client-sdk";
import NavBar from "@/components/ui/navbar";
import AirlineInfoCard from "@/components/ui/airwayscomponents/airlineInfoCard";
import airplaneImg from "@/assets/img/airways/airplane.jpg";
import hotAirBalloonImg from "@/assets/img/airways/hotairBalloon.jpg";
import airplaneDining from "@/assets/img/airways/airplaneDining.jpg";
import { FlightCalendar } from "@/components/ui/airwayscomponents/flightCalendar";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X } from "lucide-react";

import AirlineHero from "@/components/ui/airwayscomponents/airlineHero";
import AirlineDestination from "@/components/ui/airwayscomponents/airlineDestination";
import LoginContext from "@/utils/contexts/login";
import { addDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import LoginHomePage from "@/components/LoginHomePage";
import { MagicWandIcon, MarginIcon } from "@radix-ui/react-icons";

export default function Airways() {
  const ldclient = useLDClient();

  const { flightBookingModule, launchClubLoyalty, launchAi } = useFlags();

  console.log(launchAi)

  const { toast } = useToast();
  const [fromLocation, setFromLocation] = useState("From");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [toLocation, setToLocation] = useState("To");
  const [showSearch, setShowSearch] = useState(false);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const { bookedTrips, setBookedTrips } = useContext(TripsContext);
  const { setPlaneContext } = useContext(LoginContext);
  const [date, setDate] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  const { isLoggedIn, setIsLoggedIn, loginUser, logoutUser } =
    useContext(LoginContext);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // Memoize the context value
  const tripsContextValue = useMemo(() => ({ bookedTrips, setBookedTrips }), [bookedTrips, setBookedTrips]);
  const loginContextValue = useMemo(() => ({ isLoggedIn, setIsLoggedIn, loginUser, logoutUser }), [isLoggedIn, setIsLoggedIn, loginUser, logoutUser]);

  // Use useCallback for functions that are passed as props
  const handleLogout = useCallback(() => {
    logoutUser();
    if (ldclient) {
      const context: any = ldclient.getContext();
      context.user.tier = null;
      ldclient.identify(context);
      setCookie("ldcontext", context);
    }
  }, [logoutUser, ldclient]);

  const bookTrip = useCallback(() => {
    const startDate = `${date!.from.getMonth() + 1
      }/${date!.from.getDate()}/${date!.from.getFullYear()}`;
    const returnDate = `${date!.to.getMonth() + 1
      }/${date!.to.getDate()}/${date!.to.getFullYear()}`;
    const tripIdOutbound = Math.floor(Math.random() * 900) + 100; // Generate a random 3 digit number for outbound trip
    const tripIdReturn = Math.floor(Math.random() * 900) + 100; // Generate a random 3 digit number for return trip

    const outboundTrip = {
      id: tripIdOutbound,
      fromCity: fromCity,
      from: fromLocation,
      to: toLocation,
      toCity: toCity,
      depart: startDate,
      airplane: "a380",
      type: "Outbound",
    };
    const returnTrip = {
      id: tripIdReturn,
      from: toLocation,
      fromCity: toCity,
      to: fromLocation,
      toCity: fromCity,
      depart: returnDate,
      airplane: "a380",
      type: "Return",
    };

    setBookedTrips([...bookedTrips, outboundTrip, returnTrip]);

    setPlaneContext("a380");

    toast({
      title: "Flight booked",
      description: `Your round trip from ${fromLocation} to ${toLocation} and back has been booked.`,
    });
  }, [fromCity, fromLocation, toLocation, toCity, date, bookedTrips, setBookedTrips, setPlaneContext, toast]);

  const handleSendMessage = useCallback(async () => {
    if (inputMessage.trim() === "") return;

    const newMessages = [
      ...messages,
      { role: "user", content: inputMessage },
    ];
    setMessages(newMessages);
    setInputMessage("");

    try {
      const response = await fetch("/api/travel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await response.json();
      setMessages([...newMessages, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [messages, inputMessage]);

  const handleAIChat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAiResponse(''); // Clear previous response

    try {
      const response = await fetch('/api/travel-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, newMessage }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'user', content: newMessage },
        { role: 'assistant', content: '' }, // Placeholder for streaming response
      ]);

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Update the last message (assistant's response) with the new chunk
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1].content = fullResponse;
          return updatedMessages;
        });

        // Also update aiResponse state for immediate display
        setAiResponse(fullResponse);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TripsContext.Provider value={tripsContextValue}>
      <LoginContext.Provider value={loginContextValue}>
        <Toaster />
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <LoginHomePage variant="airlines" name="Launch Airways" />) : (
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`flex h-screen text-white flex-col font-audimat`}
            >
              <NavBar launchClubLoyalty={launchClubLoyalty} variant={"airlines"} handleLogout={handleLogout} />
              {flightBookingModule &&
                <header className={`py-20 bg-gradient-airways`}>
                  <div className="lg:mx-auto max-w-7xl px-2">
                    <div className="grid lg:flex lg:flex-row items-start lg:items-center lg:justify-between gap-y-6 lg:gap-y-0 lg:space-x-4">
                      <AirlineDestination
                        setActiveField={setActiveField}
                        setShowSearch={setShowSearch}
                        fromLocation={fromLocation}
                        setFromCity={setFromCity}
                        toLocation={toLocation}
                        showSearch={showSearch}
                        activeField={activeField}
                        setToLocation={setToLocation}
                        setToCity={setToCity}
                        setFromLocation={setFromLocation}
                      />

                      <div className="grid h-10 border-b-2 border-white/40 text-4xl md:text-3xl lg:text-2xl xl:text-4xl px-4 pb-12 items-center text-center justify-center">
                        <Select defaultValue="Round Trip">
                          <SelectTrigger className="text-white">
                            <SelectValue placeholder="Select trip type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Round Trip">Round Trip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div
                        className={`items-center text-xl font-audimat border-b-2 pb-2 border-white/40 ${showSearch ? "" : ""
                          }`}
                      >
                        <FlightCalendar
                          date={date}
                          setDate={setDate}
                          className="font-audimat"
                        />
                      </div>
                      <div className="grid h-10 border-b-2 border-white/40 text-4xl md:text-3xl  pb-12 lg:text-2xl xl:text-4xl px-4 items-center text-center justify-center">
                        <Select defaultValue="1 Passenger">
                          <SelectTrigger className="text-white">
                            <SelectValue placeholder="Select Passengers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1 Passenger">1 Passenger</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex mx-auto">
                        {fromLocation !== "From" && toLocation !== "To" && (
                          <motion.button
                            whileTap={{ scale: 0.5 }}
                            onClick={() => bookTrip()}
                            className={` items-center `}
                          >
                            <img src="ArrowButton.png" width={60} className="" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </header>
              }
              <AirlineHero
                launchClubLoyalty={launchClubLoyalty}
                showSearch={showSearch}
              />

              <section
                className={`relative flex flex-col sm:flex-row justify-center 
                gap-x-0 gap-y-6 sm:gap-x-6 lg:gap-x-24 py-14 z-0 bg-white !font-sohne px-6 ${showSearch ? "blur-lg" : ""
                  }`}
              >
                <AirlineInfoCard
                  headerTitleText="Wheels up"
                  subtitleText="You deserve to arrive refreshed, stretch out in one of our luxurious cabins."
                  imgSrc={airplaneImg}
                />
                <AirlineInfoCard
                  headerTitleText="Ready for an adventure"
                  subtitleText="The world is open for travel. Plan your next adventure."
                  imgSrc={hotAirBalloonImg}
                />
                <AirlineInfoCard
                  headerTitleText="Experience luxury"
                  subtitleText="Choose Launch Platinum. Select on longer flights."
                  imgSrc={airplaneDining}
                />
              </section>
            </motion.main>
          )}
        </AnimatePresence>
        {isLoggedIn && launchAi && (
          <AnimatePresence>
            {isChatOpen ? (
              <motion.div
                initial={{ width: 0, height: 0, opacity: 0, y: 100, x: "50%" }}
                animate={{ width: "50vw", height: "30vh", opacity: 1, y: 0, x: "-50%" }}
                exit={{ width: 0, height: 0, opacity: 0, y: 100, x: "50%" }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="fixed bottom-4 left-1/2 z-50 overflow-hidden rounded-2xl shadow-lg"
              >
                <Card className="w-full h-full flex flex-col bg-gradient-airways text-white">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-xl">Launch Airways AI 🪄</h3>
                    <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-grow p-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`p-4 rounded-lg mb-2 ${
                        message.role === 'user' ? 'bg-airlinePurple/20 text-white' : 'bg-white/20 text-white'
                      }`}>
                        <strong>{message.role === 'user' ? 'You: ' : 'AI: '}</strong>{message.content}
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="p-4 border-t flex text-white">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Let's book it..."
                      className="flex-grow mr-2 border-white/30 text-black placeholder-opacity-100"
                      onKeyPress={(e) => e.key === "Enter" && handleAIChat(e)}
                    />
                    <Button onClick={handleAIChat} className="bg-airlinePurple hover:bg-airlinePurple/80">
                      {isLoading ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <div
                
                className="fixed bottom-4 right-4 z-50"
              >
                <Button
                  className="bg-gradient-airways text-white text-lg px-6 py-8 rounded-full shadow-lg relative overflow-hidden"
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Chat with AI
                </Button>
              </div>
            )}
          </AnimatePresence>
        )}
      </LoginContext.Provider>
    </TripsContext.Provider>
  );
}
