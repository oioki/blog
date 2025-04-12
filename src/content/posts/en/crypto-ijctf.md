---
title: "Crypto @ IJCTF"
id: "en/crypto-ijctf"
publishDate: "26 Apr 2020"
description: ""
---

These solutions do not pretend to be fully mathematically or algorithmically correct nor they are optimal. They just worked at the moment when [IJCTF](https://www.ijctf.ml/) was conducted. Also, I tried to describe my way of thoughts during solving challenges.

## Plain-t.. uh Image

Here is the challenge file [flag.jpg.enc](https://github.com/oioki/ijctf-2020/blob/master/plain-image/flag.jpg.enc). From file extension, we know it is a JPEG file. On the other hand, it is said that XOR with a 40-byte key was used for encryption. The solution is a combination of two quite well-known facts:

- JPEG files have some standard structure, including several bytes of the header at the very beginning of the file;
- XOR is a symmetric operation: if `plaintext ⊕ key == ciphertext` then `ciphertext ⊕ key == plaintext`.

I took some other JPEG file and had a look at its header:

```md
$ hexdump -C something.jpg  | head -2
00000000  ff d8 ff e0 00 10 4a 46  49 46 00 01 01 00 00 01  |......JFIF......|
00000010  00 01 00 00 ff db 00 43  00 03 02 02 02 02 02 03  |.......C........|
```

We can assume that the original image had the same header, and we can use that assumption to derive a part of the key. See [initial_key_guess.py](https://github.com/oioki/ijctf-2020/blob/master/plain-image/initial_key_guess.py), here is the interesting part:

```py
# initial guess on cipher key
i = 0
key = []

bytes = open("flag.jpg.enc", "rb").read(32)
for byte in bytes:
    key_byte = byte ^ jpeg_header[i % 40]
    key.append(key_byte)
    print(hex(key_byte), end=', ')
    i += 1

# pad the key with zeros up to 40 bytes
key += [0] * (40-len(key))
```

The resulting image is of course corrupted, but after having a look at it I noticed this string `56789:CDEFFH(J2TUVHX`. The fixed version of this string, `456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz` is apparently a crucial part of the JPEG internal structure and we can use this to recover all bytes of the key. To be honest, I did the rest of the work to match this magic string. See [decrypt.py](https://github.com/oioki/ijctf-2020/blob/master/plain-image/decrypt.py) for the rest of the solution. And the flag is

![](/assets/blog/crypto-ijctf/flag.jpg)


## Nibiru

It was quite difficult for me and took a good 7 hours to crack. First, I read the description of the puzzle carefully and wrote a program which ciphers the plaintext correctly and passes the “test”. See [cipher.py](https://github.com/oioki/ijctf-2020/blob/master/nibiru/cipher.py).

The next step is to write a decipher program, but we don’t know the key. Dumb brute force means trying `26! = 4.0329146e+26` possible keys, which is beyond any imagination. We need to act in a more smart way.

I read the problem statement again and noticed that we need to use that first sentence `T jabd ql ehzrzbg dpe gkyx hwcroh em voz.` decodes to `I fear my actions may have doomed us all.` Let’s imagine the initial offset and the key for the “I” (the first letter of the plaintext) are already known and write such equation:

```md
(init_offset + offset("I")) % 26 = offset("J")
```

Here we have one equation but 3 unknowns. Looks unsolvable… But after some thinking, I understood that actually we can write a lot of such equations. For the sake of simplicity, we will write `offset("I")` just as `I` and omit all mentions of `% 26` because we already know the operations are taking place in the [ring of integers modulo 26](https://en.wikipedia.org/wiki/Modular_arithmetic). After some time we get this system of equations:

```md
init + I = T
I + F = J
F + E = A
E + A = B
A + R = D
R + M = Q
M + Y = L
Y + A = E
A + C = H
C + T = Z
T + I = R
I + O = Z
O + N = B
N + S = G
S + M = D
M + A = P
A + Y = E
Y + H = G
H + A = K
A + V = Y
V + E = X
E + D = H
D + O = W
O + O = C
O + M = R
M + E = O
E + D = H
D + U = E
U + S = M
S + A = V
A + L = O
L + L = Z
```

We have 32 equations and 27 unknowns (all alphabet letters + initial offset). It took a while before I understood how to write the brute forcer properly. The main idea is that we can start brute-force starting from the most frequent letters (A, E). The first letter A has 26 variants, E has 25 variants, and after trying 26*25=650 combinations we already can derive some other letters. For example, from these equations:

```md
F + E = A
E + A = B
A + Y = E
```

assuming that we “know” A and E, we can derive (keep in mind that all operations are still made in modulo 26):

```md
F = A - E
B = E + A
Y = E - A
```

Cool thing: we already heavily reduced the number of possible key variations. Next, we can’t derive more letters, so we need to guess. The next most popular letter is “M”. After iterating through all possible values, we can derive almost all remaining letters, using modulo arithmetic. I will not write them here for brevity.

At this point, I had one huge mistake which worth me around 4 hours. When my half-baked script printed something like `FEARBCD...` I understood that it was the correct key used to cipher the message and rushed into deciphering. Indeed, it was correct:

```py
>>> from cipher import cipher
>>> cipher('I fear my actions may have doomed us all.', 'FEARBCDGHIJKLMNOPQSTUVWXYZ', 10)
'T JABD QL EHZRZBG DPE GKYX HWCROH EM VOZ.'
```

(initial offset of 10 could have been guessed manually)

However, in the end, it actually made sense to complete the program and allow it to print all possible keys. Read on.

I was somehow out of mental energy and wrote a dumb decipher program, which tried all possible next letters of assumed plaintext, and if it matched the known ciphertext, then we moved on to the next letter. See [decipher.py](https://github.com/oioki/ijctf-2020/blob/master/nibiru/decipher.py). The original plaintext:

```md
I fear my actions may have doomed us all. AFTER MONTHS OF FILLING OUR HOLD
WITH TREASURE, WE WERE ABOUT TO SET SAIL WHEN WORD WAS DELIVERED OF AN EVEN
GREATER PRIZE: A SARCOPHAGUS OF THE PUREST CRYSTAL, FILLED TO THE BRIM WITH
BLACK PEARLS OF IMMENSE VALUE. A KING'S RANSOM! THE MEN AND I WERE OVERTAKEN
WITH A DESIRE TO FIND THIS GREAT TREASURE. AND AFTER SEVERAL MONTHS OF
SEARCHING, FIND IT WE DID. WHAT WE DIDN'T REALIZE WAS THAT THE ENTITY THAT
DWELLED INSIDE THAT CRYSTAL SARCOPHAGUS HAD BEEN SEARCHING FOR US AS WELL. IN
OUR THIRST FOR POWER AND WEALTH, WE HAD DISCOVERED A TERRIBLE EVIL. IT PREYED
UPON OUR FEARS, DRIVING US TO COMMIT HORRIBLE ACTS. FINALLY, IN AN ACT OF
DESPERATION TO STOP WHAT WE HAD BECOME, I SET THE SHIP ASHORE ON THE MISSION
COAST, IN A COVE WE NAMED AFTER WHAT WE WOULD SOON BRING THERE: CRYSTAL COVE.
WE BURIED THE EVIL TREASURE DEEP, DEEP UNDERGROUND. I CONCEALED ITS LOCATION
ABOARD THE SHIP AND ARTFULLY PROTECTED IT BY AN UNCRACKABLE CIPHER. I BROUGHT
THE SHIP HERE, TO THE TOP OF THIS MOUNTAIN, TO STAY HIDDEN FOREVER. I ENCODED
THE FLAG WITH THE VIGENERE CIPHER, FTGUXI ICPH OLXSVGHWSE SOVONL BW DOJOFF
DHUDCYTPWMQ. ONE OF THE TWELVE EQUIVALENT KEYS USED TO DECODE THIS MESSAGE
WAS USED.
```

Alright, it is a cipher inside a cipher. Ciphertext produced by [Vigenere cipher](https://en.wikipedia.org/wiki/Vigen%C3%A8re_cipher): `FTGUXI ICPH OLXSVGHWSE SOVONL BW DOJOFF DHUDCYTPWMQ`.

As you remember, in the beginning, I did not complete my generator of possible keys and stopped at `FEAR...`. Our team wasted several hours trying to brute force Vigenere cipher using a dictionary, wild guessing, tried ROT13, and its variations, but no luck. 2 AM, and I almost went to bed, but then I had a moment of insight: I saw that my key generator was printing some weird 12 combinations and they were not filtering till the very end. I thought it was my coding mistake. But it was not. After completing the key generator, I’ve got the list of “twelve equivalent keys”:

```md
ACHKNQUXFRDILOSVYEBGJMPTWZ
FEARBCDGHIJKLMNOPQSTUVWXYZ
JVDQAMYIUCPELXHTBOFKWGSRNZ
SKBXPIAVNGFTLCYQJRWOHEUMDZ
HQFISEJTAKURLVBMWCNXDOYGPZ
BINTYRHMSXAGLQWEDKPVFCJOUZ
UOJCFVPKDEWQLGAXSMHRYTNIBZ
PGYODXNCWMBVLRUKATJESIFQHZ
DMUEHOWRJQYCLTFGNVAIPXBKSZ
NRSGWKFOBTHXLEPCUIYMAQDVJZ
YXWVUTSQPONMLKJIHGDCBRAEFZ
WTPMJGBEYVSOLIDRFXUQNKHCAZ
```

All of them could successfully encrypt `I fear...` to `T jabd...`, this feature made them “equivalent”. Here is the not-so-beautiful generator of all possible keys: [generate_keys.py](https://github.com/oioki/ijctf-2020/blob/master/nibiru/generate_keys.py)

Lesson learned: Do not rush in complex challenges (which takes hours anyway) and try to implement the idea comprehensively.

Knowing that we have 12 possible values for Vigenere cipher, we can try them [manually](https://cryptii.com/pipes/vigenere-cipher) and get a solution:

```md
SCOOBY DOOO HOMOGENOUS SYSTEM OF LINEAR CONGRUENCES
```

## Space!

A couple of initial thoughts:

1. Knowing that the compound key (K1+K2+K3+K4) had 8 random bytes, gave us this number of possible combinations: `62^8 = 218340105584896` (62 is the length of the alphabet `[a-zA-Z0-9]`). The first approximations showed that brute-forcing is not feasible. We need to come up with a more smart solution.
2. The “example” and “production” cases both share the same plaintext for the “message” (`Its dangerous...`) and the same IV (AES initialization vector). Also, we have a “message” ciphertext both for example and production. So, we have quite a lot of information...

I have drawn the flow of the encryption. Note IV entering the schema on each encryption round, usage of keys (K1, K2, K3, K4). Also, 1''' means the 1st block of plaintext after applying three keys (K1+K2+K3), etc.

![](/assets/blog/crypto-ijctf/space-aes.jpg)

The idea of the solution came unexpectedly. I suddenly remembered the concept of [rainbow tables](https://en.wikipedia.org/wiki/Rainbow_table). When we can’t afford brute-forcing in one direction, we can do it both ways and build two tables of all combinations in both directions. Then if we have an intersection in the middle, then it’s a solution. For the “message”, we know both plaintext (`Its dangerous...`) and its ciphertext (base64 decode of `NeNpX4+pu2elWP+R2VK78Dp0gbCZPeROsfsuWY1Knm85/4BPwpBNmClPjc3xA284`), so we can actually do it.

To create a proof-of-concept, I encrypted the plaintext using all the same keys `aa...(14 zero bytes)` and with a reduced alphabet `[a-z]`. See poc_data.py and the output:

```md
0 4974732064616e6765726f757320746f 20736f6c766520616c6f6e652c207461 6b652074686973000000000000000000
1 4da1d998a0ff24d4ed3f12d626a2e2d2 1bfebde1a66da5a6fde539fa254864fa b059b8705506c2d85f11ff36aabfd340
2 f559362fec4dfeb678a73294e04ca505 699329288ae54b6975ec6822f34acd2e d66c76ee47499c0ebab83e44cddccabc
3 88bccfa684a0fd25a4bba24217eb7448 933413f8661d18bd2ef3aa1cd1b073fa ccbd8fc20c2a6e330edb32a9b5a27682
4 a5bb08fe02ef190c268ce4b1a194cbed eb0bac216d68f701dbb3f58f1bb06e84 10ec4ee0118188ebaf1b3d30886b2ec5
```

0th line is the original plaintext, 1st line is a ciphertext after applying K1, etc. 4th line is the output (which is also given in the problem statement, but for an unknown set of keys).

Now, for proof-of-concept, the goal is to find such K1+K2 which produce `f559362fec4dfeb678a73294e04ca505` as a 1'''' ciphertext, and also keys K4+K3 which decrypt given ciphertext to the same value `f559362fec4dfeb678a73294e04ca505`.

After some coding, we have two programs – [down.py](https://github.com/oioki/ijctf-2020/blob/master/space/down.py) and [up.py](https://github.com/oioki/ijctf-2020/blob/master/space/up.py) which generate tables for K1+K2 and K4+K3 respectively. Running them on PoC data, and comparing the produced tables, we can see there is the intersection at (6161… 6161… 6161… 6161…):

```sh
$ ./down.py > poc.down
$ ./up.py > poc.up

$ head -4 poc.down
61610000000000000000000000000000 61610000000000000000000000000000 -> f559362fec4dfeb678a73294e04ca505 699329288ae54b6975ec6822f34acd2e
61610000000000000000000000000000 61620000000000000000000000000000 -> 7a8d5b83afeb216fb9645b0041f8ef99 7b8698126937dec1772ccf401b97e29c
61610000000000000000000000000000 61630000000000000000000000000000 -> 3f0f3106950206ed20cf7e0c40223c4f 6f91e01b9a787d13e171d7ffb6441edd
61610000000000000000000000000000 61640000000000000000000000000000 -> fb71e816974f74e07932b3043fbbe0ac c7d71d79cf9537a1ff738ac4a2cf1fb8

$ head -4 poc.up
61610000000000000000000000000000 61610000000000000000000000000000 -> f559362fec4dfeb678a73294e04ca505 699329288ae54b6975ec6822f34acd2e
61610000000000000000000000000000 61620000000000000000000000000000 -> 2f97283990e2ce17b29558fb78b02495 ff00ef073786d0feece71ade5ca1285f
61610000000000000000000000000000 61630000000000000000000000000000 -> b5fffa80660aee14d2fb05c5b1270ec1 dddd0ffd3a3513226b6a3a1940ac610e
61610000000000000000000000000000 61640000000000000000000000000000 -> 027a6cc3fd782dae3a1567abca9491f6 ac48eb88b70031b6654f0514ae2f0802
```

This simple sub-challenge is solved, and it is quite easy to scale up to the full alphabet.

The “production” produces 2 files of 2 GiB and 14 776 337 rows in each of them. The small difficulty is to find the intersection between them. I was lazy and did it using Bash:

```sh
$ ./down.py > down
$ ./up.py > up
$ awk '{print $4}' up > up.4
$ awk '{print $4}' down > down.4

$ cat up.4 down.4 | sort | uniq -cd
      2 ff44f13e9d24bbd1370812417980cfa0

$ grep ff44f13e9d24bbd1370812417980cfa0 down
6b680000000000000000000000000000 37770000000000000000000000000000 -> ff44f13e9d24bbd1370812417980cfa0 5c681cbb1578f85f0e91dedbf32f91d0

$ grep ff44f13e9d24bbd1370812417980cfa0 up
59350000000000000000000000000000 61580000000000000000000000000000 -> ff44f13e9d24bbd1370812417980cfa0 5c681cbb1578f85f0e91dedbf32f91d0
```

That means the intersection happened at hashes `(ff44f13e9d24bbd1370812417980cfa0 5c681cbb1578f85f0e91dedbf32f91d0)` and the recovered keys are `(6b68... 3777... = K1 K2)` and `(6158... 5935... = K3 K4)`.

Now we can use it to decrypt the flag, using deflag.py:
`ijctf{sp4ce_T1me_Tr4d3off_is_c00l_but_crYpt0_1s_c00l3r_abcdefgh}`
