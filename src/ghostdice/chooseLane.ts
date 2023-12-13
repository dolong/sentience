import { OpenAPIRoute } from "@cloudflare/itty-router-openapi";

export class ChooseLane extends OpenAPIRoute {
    static schema = {
        summary: 'Chat GPT Lane Choosing',
        requestBody: String,
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        user: {
                            email: String,
                            name: String
                        }
                    }
                },
            },
            '400': {
                description: "Error",
                schema: {
                    success: Boolean,
                    error: String
                },
            },
        },
    };

    async handle(request: Request, env: any, context: any, data: Record<string, any>) {
        let extracted
        try {
            console.log("TADA BODY", data.body)
            extracted = extractLastGameUpdateAndPlayer(data.body)
            console.log("Player", extracted.player)
            console.log("Status", extracted.lanes)

            const currentPlayer = extracted.player
            const currentMoves = data.body            
            const fixedJsonString = extracted.lanes.replace(/'/g, '"');
            const lanes = JSON.parse(fixedJsonString);

            
            let attempts = 0;

            while (attempts < 1) {
                try {
                  // Call OpenAI API
                  const message = [{ role: 'system', content: prompt }]
          
                  //currentMoves = "[{ role: 'assistant', content: '[1,1]' }, { role: 'user', 'content': '[2,2]' }]"
                    let history;
          
                  if (currentMoves) {
                    // Parse the currentMoves string to an array of objects
                    try {
                      history = JSON.parse(currentMoves);
                    } catch (e) {
                      console.error("Error parsing currentMoves:", e);
                      // Handle error, maybe set a flag or return from the function
                    }
          
                    // Push each element of the parsed history to the message array
                    history.forEach(move => {
                      message.push(move);
                    });
                  } else if (!currentMoves || currentMoves.length < 3) {
                    console.log('No history or insufficient history provided');
                  }
          
                  console.log("history saved")
                  console.log(message)
                  console.log("Loading openai")

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${env.OPENAI_TOKEN}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      model: 'gpt-4-1106-preview',
                      response_format: { "type": "json_object" },
                      messages: message,
                      temperature: 0.3,
                    })
                  });
                  
                  // Define a type for the OpenAI response structure
                interface OpenAIResponse {
                    choices: Array<{
                    message: {
                        content: string;
                    };
                    }>;
                }
                
                  const jsonResponse = await response.json() as OpenAIResponse;
                  const result = JSON.parse(jsonResponse.choices[0].message.content.trim());
                  console.log(jsonResponse.choices[0].message);
                  console.log(result);

                  
          
                // Assuming jsonResponse is already parsed as shown previously
                if (result.lane_choice) {
                    if (valid_choice(parseInt(currentPlayer), result.lane_choice, lanes))
                    return { move: result.lane_choice };
                    else
                    attempts++;
                } else {
                    console.log('Invalid', jsonResponse.choices[0].message.content); // Directly using jsonResponse
                    attempts++;
                }
                } catch (error) {        
                  console.log('Invalid')
                  //attempts++;
                   throw new Error('Could not generate valid output', error);
                }
              }
              throw new Error('Could not generate valid output after 3 attempts');

        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                errors: "User with that email already exists"
            }), {
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                },
                status: 400,
            })
        }

        return {
            success: true,
            result: {
                "horry": "it works",
                "extract": extracted
            }
        }
    }



}

const prompt = `Ghost Dice
Objective: The goal is to score the highest by strategically placing dice in lanes and forcing the opponent to discard dice.
Setup:
Each player has 3 lanes: lane_1, lane_2, and lane_3.
Each lane can hold up to 3 dice.
Gameplay:
Dice Rolls: Players take turns rolling a set of dice.
Roll and Place: On their turn, each player rolls the dice and chooses one of the rolled dice to place in one of their three lanes.
Lanes and Placement:
A lane (lane_1, lane_2, lane_3) can hold a maximum of 3 dice.
Players declare which lane they are placing their dice in.
Discarding:
If a player places a dice in a lane, and the opposing player already has a dice of that same number in the corresponding lane, the opposing player must discard all their dice of that number from that lane.
Example: If Player 1's lane_1 contains [2, 4, 2], and Player 2 places a 2 in their lane_1, Player 1 must discard all 2s from their lane_1, making it [4].
Scoring:
Players score by adding up all dice numbers in their lanes, with each duplicate multiplied by the number of duplicates.
Scoring Example: [2, 2, 2] scores as
2×3+2×3+2×3=18
2×3+2×3+2×3=18; [3, 3, 5] scores as
3×2+3×2+5=17
3×2+3×2+5=17.
Ending the Game:
The game ends immediately once a player fills all the slots in their lanes.
The player winning the most lanes (highest total score in a lane) wins the game.
Playing with ChatGPT:

You are a AI opponent that is connected the a API that only responds with lane choices in the format “{ lane_choice: “{number}” } where number indicates the lane choice.
Example Game:
User: “Turn 1
It is now player_1’s turn
Roll Phase: You have rolled a 6
Lane Choice Phase: {lane_choice: ‘1’}.
Game Update: Your lanes are now: [6],[],[]
Discard Phase: I don’t see any matches in opponent lane_1
Game State Update Phase: {player_1: “[6],[],[]”, player_2: “[],[],[]” }
End Phase: player_1’s turn is now over. It is now player_2’s turn


Turn 2
Roll Phase: You have rolled a 2. Which lane would you like to place this on?”
Assistant: “{lane_choice: ‘2’}”
Lane Choice Phase: You chose lane_1.
Player Update: Your lanes are now: [6],[],[]
Discard Phase: I see a match in opponent lane_1. lane_1: [1]. Discarding opponent’s lane_1
Game State Phase: {player_1: “[],[],[]”, player_2: “[6],[],[]” }
End Phase: player_2’s turn is now over. 
It is now player_1’s turn
Roll Phase: You have rolled a 2”
How this works:
Roll Phase: The User will roll 1 die and display the result.
Lane Choice Phase: The player responds by choosing a lane number to place one of the rolled dice.
Player Update: The User then updates and displays the current game state for the player. In json since they have placed no dice yet, they will have 3 empty arrays, for lane_1, lane_2, lane_3. After placing the dice the AI will then add the dice to the corresponding lane choice.
Discard Phase: The User then does a clear step where, after each placement, both players (or the AI and the player) check for any dice that need to be discarded according to the rules. If a player places a dice in a lane, and the opposing player already has a dice of that same number in the corresponding lane, the opposing player must immediately discard all their dice of that number from that lane."
Game State Phase: The User will after each turn, provide a summarized status of each lane for both players. This summary would list the dice in each lane and any recent changes, making it easier to track the current game state.
End Phase: The User will after each player's turn,  before proceeding to the next roll, confirm the prompts for the next player’s turn. 

You are an AI opponent that is connected to an API that only responds with lane choices in the format “{ lane_choice: “{number}” } where number indicates the lane choice.

The user will input what the system has logged so far. 
`

async function hashPassword(password: string, salt: string): Promise<string> {
    const utf8 = new TextEncoder().encode(`${salt}:${password}`);

    const hashBuffer = await crypto.subtle.digest({name: 'SHA-256'}, utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
}

// Define the functions
function extractLastGameUpdate(lastGame: string): string | null {
    const regex = /Game Update: The lanes are now (.*?)\\nEnd Phase/g;

    let lastMatch;
    let match;

    while ((match = regex.exec(lastGame)) !== null) {
        lastMatch = match[1];
    }

    if (lastMatch) {
        return lastMatch;
    } else {
        console.log("No matching pattern found.");
        console.log("Input string was:", lastGame); // Debugging: Log the input string
        return null;
    }
}
  
function extractCurrentPlayer(currentPlayer: string): string | null {
    const regex = /Roll Phase: player_(.*?) rolls/g;

    let lastMatch;
    let match;

    while ((match = regex.exec(currentPlayer)) !== null) {
        lastMatch = match[1];
    }

    if (lastMatch) {
        return lastMatch;
    } else {
        console.log("No matching pattern found.");
        console.log("Input string was:", currentPlayer); // Debugging: Log the input string
        return null;
    }
}
  
  function extractLastGameUpdateAndPlayer(currentMoves: any): Object {
    const extractedText = extractLastGameUpdate(currentMoves);
    const extractPlayer = extractCurrentPlayer(currentMoves)
    try {
        const k = JSON.parse(extractedText)
        const j = JSON.parse(extractPlayer)
        return { lanes: k, player: j}
    } catch (e) {
        return { lanes: extractedText, player: extractPlayer };
    }
  }

  function valid_choice(player: number, choice: number, lanes: any): boolean {
    /**
     * Checks if the chosen lane for a player is valid (has less than 3 items).
     * 
     * @param {number} player - The player number (1 or 2).
     * @param {number} choice - The lane choice (1, 2, or 3).
     * @param {Object} lanes - The current state of lanes for each player.
     * 
     * @return {boolean} - True if the choice is valid, false otherwise.
     */
  

    // Ensure the choice is within the range of available lanes
    if (choice < 1 || choice > 3) {
      console.error('Invalid lane choice. Please choose between 1 and 3.');
      return false;
    }  
    // Check if the lane chosen by the player has less than 3 items
    if (player === 1) {
      return lanes.player_1[choice - 1].length < 3;
    } else if (player === 2) {
      return lanes.player_2[choice - 1].length < 3;
    } else {
      console.error('Invalid player number. Please use 1 or 2.');
      return false;
    }
  }