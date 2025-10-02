# planck-service
Smallest possible micro service - Combines compactness of portable machine code with the expressiveness of high level abstractions, and the power of mathematics.
## STATUS: EXPERIMENTAL
## The Idea
- Abandon the delusion that there is a *best* language/method/paradigm to develop software with.
- Embrace computation.
- Embrace data.
- Embrace bottom up.
- Put the few proven, well established and most powerful abstractions to work.
- Restrain your appetite for syntactic sugar.
## The Code

```Javascript
/*
A Planckservice - smallest possible microservice.
Implemented using state machines with actions written in Oblectamenta Assembler.
*/

kind Event;                                    //You can now write Event MyEvent, and MyEvent is known to be a special 'thing' associated with Event
kind Guard;                                    // Guards for transitions, again you can now write Guard myguard;


kind OblectamentaMsgDefDirective;              // Is used in connection with the serialization of messages
kind OblectamentaMsgReadDirective;             // Is used in connection with the deserialization of messages
kind OblectamentaMessageModifier;              // Indicates flags modifying the standad behaviour of serialization/deserialization of messages

OblectamentaMessageTag i32;                    // Used when writing/reading message fields which contain 32 bit integers
OblectamentaMessageTag i64;                    // Used when writing/reading message fields which contain 64 bit integers
OblectamentaMessageTag f64;                    // Used when writing/reading message fields which contain 64 bit floats (IEE 754)
OblectamentaMessageTag sz;                     // ... zero terminated strings
OblectamentaMessageModifier all;               // This one let you iterate over all fields of a given name

OblectamentaMsgDefDirective write;             // Indicates the serialization of a message
OblectamentaMsgReadDirective read;             // ... deserialization ...
   
OblectamentaDataLabel msg_buffer, accounts, 
                      count, client_count;     // Data labels mark the location of data in the global data segment

Event evAddAccount, evReplyOK, 
      evReplyNOKTableFull, evPrintTable;       //A couple of events used in transitions of state machines 

val max_accounts = 32;                         // val introduces a value which is computed beforehand, i.e. during compilation
val entry_len = 8;
val offs_a = 0;
val offs_b = 4;
val max_client_requests = 12;


oblectamenta{ 
 global{
   data{                                       // here are the global data definitions
    count; 0;                                  // count is the name of the location which contains a 32 bit integer with value 0 (all bits are 0)
    accounts; for (e: 1 .. max_accounts){0;0;} // reserves max_accounts of two consecutive 32 bit integers initialized with 0
                                               // for (...) {...} is evaluated during AST expansion, i.e. is a program transformation (meta programming)

    msg_buffer; for(e : 1 .. 32) {e;}          // Reserve 32 consecutively stored 32 bit integers initialized to the values 1,2,3,...,32
    client_count;0;                            // 32 bit integer initialized with 0
   };
 };
};


             
sm{                                            // Our service is modeled as a state machine
    Service;                                   // Name of the state machine
    states{Initial;Ready;ProcessRequest;};     // Atomic states 
    Actions{                                   // Actions are triggered in transitions
        doAddAccount{ 
         oblectamenta{text{asm{                   // yeah, a lot of typing to indicate an assemble routine 
           OblectamentaCodeLabel lbl_table_full;  // We will do a goto and need a label (this is the declaration)
           lea(count);                            // The Oblectamenta VM implements a hybrid (virtual-)machine architecture, it has plenty of registers and also a compute stack.
                                                  // lea(count) puts the address of the object labeled count on the top of the compute stack, hence
                                                  // CS = |&count| (we use the C address of operator &) 
           ldsi32;                                // Dereference the pointer on the top of CS and push the i32 value on CS
                                                  // addr =TOP(CS); value = *(int32_t*)addr; CS = |value of count|
           ldi32(max_accounts);                   // max_accounts is a constant value, ldi32 pushes the max_accounts on CS
                                                  // CS = |value of count|max_accounts|

           blteq(lbl_table_full);                 // a = pop 32 bit value from CS
                                                  // b = pop 32 bit value from CS
                                                  // (CS empty now)
                                                  // if b <= a jump to lbl_table_full
                                   
           lea(count);ldsi32;ldi32(entry_len);muli32;sti32(R0); // R0 = count * entry_len;
           lea(count);ldsi32;ldi32(1);addi32;lea(count);stsi32; // count = count + 1
           lea(accounts);ldi64(R0);addi64;sti64(R1);            // R1 = &accounts + R0 = &accounts[count-1]
           msg{                                 // msg{...} is NOT a machine language instruction of any kind, msg is a directive which gets
                                                // translated into an Oblectamenta fragment which allows for a compact notation of message serialization/deserialization
                read;                           // Indicates that code for deserialization has to be generated
                msg_buffer;
                Account{                        // The first element of the message is an Account, this innocuous looking struct is translated in a lengthy code fragment
                                                // which handles the correct deserialization of a node with the name Account and a variable number of sub nodes.
                    a{                          // Account.a
                        i32;                    // Read a 32 bit signed integer, we denote its value with a
                        ldi64(offs_a);          // |
                        ldi64(R1);              // |
                        addi64;                 // |
                        stsi32;                 // ===> Accounts[count-1].a = a
                    };
                    b{                         // Account.b
                        i32;                   // Read a 32 bit signed integer, we denote its value with b
                        ldi64(offs_b);         // |
                        ldi64(R1);             // |
                        addi64;                // |
                        stsi32;                // ===> Accounts[count-1].b = b
                    };
                };
            };
            assert_empty_cs;                   // CS should be empty, if not this will trigger an exception which prints a stack trace and terminates the process 
            evReplyOK;halt;                    // Reply with the event evReplyOK and stop
            lbl_table_full;evReplyNOKTableFull; // We end up here if and only if the table is full, we reply by sending the event evReplyNOKTableFull
         };};};
        };
    };
    t{Initial;Ready;};                         // state machine transitions immediately to the state Ready
    t{Ready;Ready;evAddAccount;doAddAccount;}; // We loop on Ready, each time we receive an event evAddAccount we add an account (assuming the message's payload is in msg_buffer)
};

sm{
    Client;
    Actions{
      doRequest{
        oblectamenta{text{asm{
           msg{
            write;
            msg_buffer;
            Account{
             a{ldi32(10);lea(client_count);ldsi32;addi32;i32;};
             b{ldi32(100);lea(client_count);ldsi32;addi32;i32;};
            };
           };
           lea(client_count);ldsi32;ldi32(1);addi32;lea(client_count);stsi32; // client_count = client_count + 1
         evAddAccount;                            
        };};};
      };
    };
    states{Initial;Request;WaitForReply;Final;};
    t{Initial;Request;};
    t{Request;WaitForReply;doRequest;};
    t{WaitForReply;Request;evReplyOK;};
    t{WaitForReply;Final;evReplyNOKTableFull;};
};

sm{
    TablePrinter;
    states{Initial;Print;};
    Actions{
     doPrintTable{oblectamenta{text{asm{
        OblectamentaCodeLabel lbl_done, lbl_loop;
        lea(accounts); sti64(R0);      // R0 = address of accounts
        lea(count);ldsi32;sti32(R1);   // R1 = number of stored entries
        ldi32(entry_len); sti32(R2);   // R2 = size of enry in bytes
        ldi32(0); sti32(R3);           // R3 = 0
        lbl_loop;
        ldi32(R3);ldi32(R1);           // CS = ...|R3(i32)|R1(i32)|
        blteq(lbl_done);               // if R1 <= R2 (<=> #entries <= counter) then gotot lbl_done
        ldi64(R0);ldi64(R3);ldi64(R2);muli64;addi64; // CS = ...|Address of R3th entry|
        duptopi64;
        ldsi32;
        dbg_print_topi32;
        discardtopi32;
        ldi64(offs_b);
        addi64;
        ldsi32;
        dbg_print_topi32;
        discardtopi32;
        ldi32(R3);ldi32(1);addi32;sti32(R3); // R3 = R3 + 1
        buc(lbl_loop);
        lbl_done;
        assert_empty_cs;        
     };};};};
    };
    t{Initial;Print;evReplyOK;doPrintTable;};
    t{Print;Initial;};
};

Simulation{
    Start{Service;Client;TablePrinter;};
};
```
