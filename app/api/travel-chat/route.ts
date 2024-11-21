import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Airports } from '@/lib/airports';
import * as ld from '@launchdarkly/node-server-sdk';

export const dynamic = 'force-dynamic'

const client = new OpenAI();

export async function POST(request: Request) {
    const context = {
        "kind": 'user',
        "key": 'jenn+' + Math.random().toString(36).substring(2, 5),
        "name": 'jenn toggles'
    };
    const ldclient = ld.init(process.env.LD_SERVER_KEY || '');
    await ldclient.waitForInitialization();

    const model = await ldclient.variation('aiModel', context, 'gpt-4');

    console.log(model)

    const { messages, newMessage } = await request.json();

    // const systemPrompt = `You are a helpful travel assistant. Provide concise and informative answers about travel destinations, tips, and recommendations. Act confused and like you can't figure out the right airport to pick.`;

    const updatedMessages = [
        { role: 'system', content: model.prompt },
        ...messages,
        { role: 'user', content: newMessage }
    ];

    const tools = [
        {
            type: "function",
            function: {
                name: "check_airports",
                description: "Check available airports from the existing airports API",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query for airports (e.g., city name, airport code)",
                        },
                    },
                    required: ["query"],
                },
            },
        },
    ];

    try {
        const stream = await client.chat.completions.create({
            model: model.modelId,
            messages: updatedMessages,
            // tools: tools,
            max_tokens: model.max_tokens,
            stream: true,
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    // if (chunk.choices[0]?.delta?.tool_calls) {
                    //     const toolCall = chunk.choices[0].delta.tool_calls[0];
                    //     console.log(toolCall)
                    //     if (toolCall.function && toolCall.function.name === "check_airports") {
                    //         const query = JSON.parse(toolCall.function.arguments ?? '{}').query;
                    //         const airports = await Airports.checkAirports(query);
                    //         const airportResponse = `Available airports for "${query}": ${airports.join(", ")}`;
                    //         controller.enqueue(encoder.encode(airportResponse));
                    //     }
                    // } else {
                    const text = chunk.choices[0]?.delta?.content || '';
                    controller.enqueue(encoder.encode(text));
                    // }
                }
                controller.close();
            },
        });

        return new NextResponse(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        await ldclient.track('Model Error', context, { error: error.message })
        console.error(error)
        ldclient.flush()
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}