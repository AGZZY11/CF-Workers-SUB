// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31
let subscriptionDays = 30; //订阅周期天数，默认30天

//节点链接 + 订阅链接
let MainData = `
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list_raw.txt
https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt
https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2
https://raw.githubusercontent.com/mahdibland/SSAggregator/master/sub/airport_sub_merge.txt
https://raw.githubusercontent.com/mahdibland/SSAggregator/master/sub/sub_merge.txt
https://raw.githubusercontent.com/Pawdroid/Free-servers/refs/heads/main/sub
`

let urls = [];
let subConverter = "SUBAPI.cmliussss.net"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; //订阅配置文件
let subProtocol = 'https';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		subConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		// 获取流量和时间戳设置
		if (env.KV) {
			try {
				const kvTotal = await env.KV.get('TOTAL');
				if (kvTotal) {
					console.log('从KV读取到总流量值:', kvTotal);
					total = parseInt(kvTotal);
				} else {
					console.log('KV中未找到总流量值，使用默认值:', total);
				}
				
				const kvTimestamp = await env.KV.get('TIMESTAMP');
				if (kvTimestamp) {
					console.log('从KV读取到过期时间戳:', kvTimestamp);
					timestamp = parseInt(kvTimestamp);
				} else {
					console.log('KV中未找到过期时间戳，使用默认值:', timestamp);
				}
				
				const kvSubscriptionDays = await env.KV.get('SUBSCRIPTION_DAYS');
				if (kvSubscriptionDays) {
					console.log('从KV读取到订阅周期天数:', kvSubscriptionDays);
					subscriptionDays = parseInt(kvSubscriptionDays);
				} else {
					console.log('KV中未找到订阅周期天数，使用默认值:', subscriptionDays);
				}
			} catch (error) {
				console.error('读取流量参数时发生错误:', error);
			}
		}

		// 计算流量信息 - 基于当前时间与过期时间的差值
		// 如果没有从KV中获取设置，则使用默认值
		console.log('开始计算流量信息 --------------');
		console.log('当前时间:', new Date(Date.now()).toISOString());
		console.log('过期时间戳:', timestamp, '对应日期:', new Date(timestamp).toISOString());
		console.log('订阅周期天数:', subscriptionDays);

		const totalBytes = total * 1099511627776; // 转换为字节 (TB to bytes)
		console.log('总流量(字节):', totalBytes, '总流量(TB):', total);

		// 计算已使用流量 - 使用固定的起始日期
		const currentTime = Date.now();

		// 从过期时间计算固定的起始时间（根据订阅周期天数）
		const oneDayMs = 24 * 60 * 60 * 1000; // 一天的毫秒数
		let fixedStartTime = timestamp - (subscriptionDays * oneDayMs); // 过期时间减去订阅周期

		// 确保起始时间不会超过当前时间（避免出现负值流量）
		if (fixedStartTime > currentTime) {
			console.log('警告：计算的起始时间晚于当前时间，将使用当前时间作为起始时间');
			fixedStartTime = currentTime;
		}

		// 确保起始时间不会早于很久以前（避免异常大的已用流量）
		const maxPastDays = 365; // 最多追溯一年
		const minStartTime = currentTime - (maxPastDays * oneDayMs);
		if (fixedStartTime < minStartTime) {
			console.log('警告：计算的起始时间过早，将限制为最多一年前');
			fixedStartTime = minStartTime;
		}

		console.log('固定起始时间计算: 过期时间戳', timestamp, '- (订阅周期', subscriptionDays, '* 一天毫秒数', oneDayMs, ') =', fixedStartTime);
		console.log('固定起始时间:', new Date(fixedStartTime).toISOString());
		console.log('当前时间:', new Date(currentTime).toISOString());
		console.log('过期时间:', new Date(timestamp).toISOString());

		// 计算已经过去的时间和总订阅时间
		const elapsedTime = Math.max(0, currentTime - fixedStartTime); // 确保不会出现负值
		const totalTime = Math.max(oneDayMs, timestamp - fixedStartTime); // 确保总时间至少为一天
		console.log('总订阅天数:', (totalTime / oneDayMs).toFixed(2), '天');
		console.log('已过天数:', (elapsedTime / oneDayMs).toFixed(2), '天');
		console.log('时间百分比:', (elapsedTime/totalTime).toFixed(4), ' (', elapsedTime, '/', totalTime, ')');

		// 计算已用流量（基于时间比例）
		let usedBytes = 0;
		if (totalTime > 0) { // 只要总时间大于0就计算
			const elapsedPercent = Math.min(elapsedTime / totalTime, 1); // 限制比例最大为1（100%）
			console.log('elapsedPercent =', elapsedPercent);
			// 确保不超过总流量
			usedBytes = Math.floor(totalBytes * elapsedPercent);
			console.log('usedBytes = totalBytes *', elapsedPercent, '=', usedBytes);
		} 

		// 剩余流量
		let remainBytes = totalBytes - usedBytes;
		console.log('remainBytes = totalBytes - usedBytes =', totalBytes, '-', usedBytes, '=', remainBytes);

		// 确保不会出现负值
		if (usedBytes < 0) {
			console.log('usedBytes < 0, 设为0');
			usedBytes = 0;
		}
		if (remainBytes < 0) {
			console.log('remainBytes < 0, 设为0');
			remainBytes = 0;
		}

		console.log('已用流量(字节):', usedBytes, 
		            '已用流量(TB):', (usedBytes / 1099511627776).toFixed(2),
		            '剩余流量(TB):', (remainBytes / 1099511627776).toFixed(2));

		// 处理过期时间
		// 如果过期时间已经过去，将其设置为当前时间后的一天
		if (timestamp < currentTime) {
			console.log('警告：过期时间已过去，将设置为当前时间后的一天');
			timestamp = currentTime + oneDayMs;
		}

		// 计算过期时间（秒）
		let expire = Math.floor(timestamp / 1000);
		console.log('过期时间(秒):', expire, '过期日期:', new Date(expire * 1000).toISOString());
		console.log('流量计算完成 --------------');
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		// 特殊处理：对KV和特定路径的请求直接转发到KV函数
		if (env.KV && (
			// 检查是否为流量参数更新请求
			(request.method === "POST" && url.searchParams.has('updateTraffic')) ||
			// 检查是否为编辑页面请求
			(userAgent.includes('mozilla') && !url.search)
		)) {
			console.log('检测到KV相关请求，转发到KV函数');
			return await KV(request, env, 'LINK.txt', 访客订阅);
		}

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				// 注释掉下面的部分，因为已经在前面处理过KV相关的请求
				/*
				if (userAgent.includes('mozilla') && !url.search) {
					await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
					return await KV(request, env, 'LINK.txt', 访客订阅);
				} else {
					MainData = await env.KV.get('LINK.txt') || MainData;
				}
				*/
				
				// 只获取节点列表数据
				MainData = await env.KV.get('LINK.txt') || MainData;
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
			let 自建节点 = "";
			let 订阅链接 = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接 += x + '\n';
				} else {
					自建节点 += x + '\n';
				}
			}
			MainData = 自建节点;
			urls = await ADD(订阅链接);
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);

			let 订阅格式 = 'base64';
			if (userAgent.includes('null') || userAgent.includes('subconverter') || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase())) {
				订阅格式 = 'base64';
			} else if (userAgent.includes('clash') || (url.searchParams.has('clash') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'clash';
			} else if (userAgent.includes('sing-box') || userAgent.includes('singbox') || ((url.searchParams.has('sb') || url.searchParams.has('singbox')) && !userAgent.includes('subconverter'))) {
				订阅格式 = 'singbox';
			} else if (userAgent.includes('surge') || (url.searchParams.has('surge') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'surge';
			} else if (userAgent.includes('quantumult%20x') || (url.searchParams.has('quanx') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'quanx';
			} else if (userAgent.includes('loon') || (url.searchParams.has('loon') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'loon';
			}

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
			else if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

			const 请求订阅响应内容 = await getSUB(urls, request, 追加UA, userAgentHeader);
			console.log(请求订阅响应内容);
			req_data += 请求订阅响应内容[0].join('\n');
			订阅转换URL += "|" + 请求订阅响应内容[1];

			if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			const result = [...uniqueLines].join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result.replace(/\u0026/g, '&'))
			}

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						"Subscription-Userinfo": `upload=0; download=${usedBytes}; total=${totalBytes}; expire=${expire}`,
					}
				});
			} else if (订阅格式 == 'clash') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'singbox') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'surge') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&ver=4&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'quanx') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
			} else if (订阅格式 == 'loon') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
			}
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl);

				if (!subConverterResponse.ok) {
					return new Response(base64Data, {
						headers: {
							"content-type": "text/plain; charset=utf-8",
							"Profile-Update-Interval": `${SUBUpdateTime}`,
							"Subscription-Userinfo": `upload=0; download=${usedBytes}; total=${totalBytes}; expire=${expire}`,
						}
					});
					//throw new Error(`Error fetching subConverterUrl: ${subConverterResponse.status} ${subConverterResponse.statusText}`);
				}
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
				return new Response(subConverterContent, {
					headers: {
						"Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`,
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						"Subscription-Userinfo": `upload=0; download=${usedBytes}; total=${totalBytes}; expire=${expire}`,
					},
				});
			} catch (error) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						"Subscription-Userinfo": `upload=0; download=${usedBytes}; total=${totalBytes}; expire=${expire}`,
					}
				});
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, ',').replace(/,+/g, ',');	// 将空格、双引号、单引号和换行符替换为逗号
	//console.log(addtext);
	if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split(',');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重
	let newapi = "";
	let 订阅转换URLs = "";
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies:')) {
					//console.log('Clash订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Clash 配置
				} else if (content.includes('outbounds"') && content.includes('inbounds"')) {
					//console.log('Singbox订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Singbox 配置
				} else if (content.includes('://')) {
					//console.log('明文订阅: ' + response.apiUrl);
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					//console.log('Base64订阅: ' + response.apiUrl);
					newapi += base64Decode(content) + '\n'; // 解码并追加内容
				} else {
					const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
					console.log('异常订阅: ' + 异常订阅LINK);
					异常订阅 += `${异常订阅LINK}\n`;
				}
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB ${追加UA}(${userAgentHeader})`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(cleanStr);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest) {
	const url = new URL(request.url);
	console.log('KV函数收到请求，URL:', url.toString());
	console.log('请求方法:', request.method);
	console.log('请求头:', JSON.stringify([...request.headers]));
	console.log('查询参数:', JSON.stringify([...url.searchParams]));
	
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				// 检查是否为流量参数更新请求
				if (url.searchParams.has('updateTraffic')) {
					console.log('检测到updateTraffic参数，处理流量参数更新请求');
					// 立即克隆请求体，以便后续处理
					const clonedRequest = request.clone();
					const requestText = await clonedRequest.text();
					console.log('收到updateTraffic请求，原始数据:', requestText);
					
					try {
						// 获取Content-Type头
						const contentType = request.headers.get('Content-Type') || '';
						console.log('请求Content-Type:', contentType);
						
						let data;
						
						// 尝试解析JSON数据
						try {
							data = JSON.parse(requestText);
							console.log('成功解析JSON数据:', data);
						} catch (parseError) {
							console.error('JSON解析失败:', parseError);
							return new Response(JSON.stringify({
								success: false, 
								message: "无效的JSON格式",
								error: parseError.message,
								receivedData: requestText.substring(0, 100) // 仅记录前100个字符用于调试
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "JSON解析失败" 
								}
							});
						}
						
						// 数据验证
						if (!data) {
							console.error('未收到有效数据');
							return new Response(JSON.stringify({
								success: false,
								message: "未收到有效数据"
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "未收到有效数据" 
								}
							});
						}
						
						// 验证total值
						if (data.total === undefined) {
							console.error('未提供total值');
							return new Response(JSON.stringify({
								success: false,
								message: "未提供总流量值"
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "未提供total值" 
								}
							});
						}
						
						// 验证timestamp值
						if (data.timestamp === undefined) {
							console.error('未提供timestamp值');
							return new Response(JSON.stringify({
								success: false,
								message: "未提供过期时间戳"
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "未提供timestamp值" 
								}
							});
						}
						
						// 范围验证
						if (parseInt(data.total) <= 0 || parseInt(data.total) > 10000) {
							console.error('total值超出合理范围:', data.total);
							return new Response(JSON.stringify({
								success: false,
								message: "总流量值超出合理范围(1-10000 TB)"
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "total值超出范围" 
								}
							});
						}
						
						const now = Date.now();
						if (parseInt(data.timestamp) < now) {
							console.error('过期时间戳小于当前时间:', data.timestamp, '当前时间:', now);
							return new Response(JSON.stringify({
								success: false,
								message: "过期时间不能早于当前时间"
							}), {
								status: 400,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "时间戳无效" 
								}
							});
						}
						
						// 更新流量参数
						console.log('准备更新流量参数 - 总流量:', data.total, '过期时间戳:', data.timestamp);
						
						try {
							// 转为字符串存储避免精度问题
							await env.KV.put('TOTAL', String(data.total));
							console.log('总流量更新成功:', data.total);
							
							await env.KV.put('TIMESTAMP', String(data.timestamp));
							console.log('过期时间戳更新成功:', data.timestamp);
							
							// 保存订阅周期天数
							if (data.subscriptionDays !== undefined) {
								await env.KV.put('SUBSCRIPTION_DAYS', String(data.subscriptionDays));
								console.log('订阅周期天数更新成功:', data.subscriptionDays);
							}
							
							// 读取更新后的值进行验证
							const newTotal = await env.KV.get('TOTAL');
							const newTimestamp = await env.KV.get('TIMESTAMP');
							const newSubscriptionDays = await env.KV.get('SUBSCRIPTION_DAYS');
							console.log('验证更新后的值 - 总流量:', newTotal, '过期时间戳:', newTimestamp, '订阅周期天数:', newSubscriptionDays);
							
							// 返回成功响应
							const successResponse = JSON.stringify({
								success: true, 
								message: "流量参数更新成功",
								updatedData: {
									total: newTotal,
									timestamp: newTimestamp,
									subscriptionDays: newSubscriptionDays
								}
							});
							
							console.log('返回成功响应:', successResponse);
							
							return new Response(successResponse, {
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "流量更新成功" 
								}
							});
						} catch (kvError) {
							console.error('KV存储操作失败:', kvError);
							return new Response(JSON.stringify({
								success: false,
								message: "存储操作失败",
								error: kvError.message
							}), {
								status: 500,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "KV存储失败" 
								}
							});
						}
					} catch (error) {
						console.error('处理流量参数请求出错:', error);
						return new Response(JSON.stringify({
								success: false,
								message: "处理请求失败",
								error: error.message
							}), {
								status: 500,
								headers: { 
									"Content-Type": "application/json",
									"X-Debug-Message": "处理请求失败" 
								}
							});
					}
				} else {
					// 常规节点链接更新
					console.log('处理常规节点链接更新请求');
					const content = await request.text();
					await env.KV.put(txt, content);
					return new Response("保存成功");
				}
				
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		// 获取流量参数
		let currentTotal = total / 1099511627776; // 转回TB单位
		let currentTimestamp = timestamp;
		let currentSubscriptionDays = subscriptionDays;

		if (hasKV) {
			try {
				const kvTotal = await env.KV.get('TOTAL');
				if (kvTotal) {
					console.log('从KV读取到总流量值:', kvTotal);
					currentTotal = parseInt(kvTotal);
				} else {
					console.log('KV中未找到总流量值，使用默认值:', currentTotal);
				}
				
				const kvTimestamp = await env.KV.get('TIMESTAMP');
				if (kvTimestamp) {
					console.log('从KV读取到过期时间戳:', kvTimestamp);
					currentTimestamp = parseInt(kvTimestamp);
				} else {
					console.log('KV中未找到过期时间戳，使用默认值:', currentTimestamp);
				}
				
				const kvSubscriptionDays = await env.KV.get('SUBSCRIPTION_DAYS');
				if (kvSubscriptionDays) {
					console.log('从KV读取到订阅周期天数:', kvSubscriptionDays);
					currentSubscriptionDays = parseInt(kvSubscriptionDays);
				} else {
					console.log('KV中未找到订阅周期天数，使用默认值:', currentSubscriptionDays);
				}
			} catch (error) {
				console.error('读取流量参数时发生错误:', error);
			}
		}

		// 计算当前流量使用情况（用于编辑页面显示）
		// 使用与主函数相同的逻辑
		const totalBytes = currentTotal * 1099511627776; // 转换为字节
		const oneDayMs = 24 * 60 * 60 * 1000; // 一天的毫秒数
		const currentTime = Date.now();
		
		// 计算起始时间并添加验证
		let fixedStartTime = currentTimestamp - (currentSubscriptionDays * oneDayMs);
		if (fixedStartTime > currentTime) {
			console.log('KV页面：警告：计算的起始时间晚于当前时间，将使用当前时间作为起始时间');
			fixedStartTime = currentTime;
		}
		
		// 避免起始时间过早
		const maxPastDays = 365;
		const minStartTime = currentTime - (maxPastDays * oneDayMs);
		if (fixedStartTime < minStartTime) {
			console.log('KV页面：警告：计算的起始时间过早，将限制为最多一年前');
			fixedStartTime = minStartTime;
		}
		
		// 计算已用和剩余流量
		const elapsedTime = Math.max(0, currentTime - fixedStartTime);
		const totalTime = Math.max(oneDayMs, currentTimestamp - fixedStartTime);
		let usedBytes = 0;
		if (totalTime > 0) {
			const elapsedPercent = Math.min(elapsedTime / totalTime, 1);
			usedBytes = Math.floor(totalBytes * elapsedPercent);
		}
		let remainBytes = totalBytes - usedBytes;
		
		// 确保不会出现负值
		if (usedBytes < 0) usedBytes = 0;
		if (remainBytes < 0) remainBytes = 0;
        
		// 格式化日期为YYYY-MM-DD
		const formatDate = (timestamp) => {
			const date = new Date(timestamp);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		};

		const expireDateFormatted = formatDate(currentTimestamp);

		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅编辑</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
					<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
					<style>
						:root {
							--bs-primary: #3f6ad8;
							--bs-primary-dark: #3555ae;
							--bs-success: #3ac47d;
							--bs-secondary: #6c757d;
							--bs-card-border-color: rgba(0,0,0,0.125);
						}
						body {
							margin: 0;
							padding: 0;
							box-sizing: border-box;
							font-size: 14px;
							background-color: #f5f6fa;
							color: #212529;
							line-height: 1.6;
						}
						.container {
							max-width: 1140px;
							margin: 0 auto;
							padding: 20px 15px;
						}
						.card {
							background-color: #fff;
							border-radius: 12px;
							box-shadow: 0 2px 15px rgba(0,0,0,0.05);
							margin-bottom: 20px;
							border: 1px solid var(--bs-card-border-color);
							transition: transform 0.2s ease, box-shadow 0.2s ease;
						}
						.card:hover {
							transform: translateY(-2px);
							box-shadow: 0 5px 20px rgba(0,0,0,0.08);
						}
						.card-header {
							border-bottom: 1px solid var(--bs-card-border-color);
							padding: 15px 20px;
							font-weight: 600;
							background-color: rgba(0,0,0,0.02);
							border-top-left-radius: 12px;
							border-top-right-radius: 12px;
							display: flex;
							justify-content: space-between;
							align-items: center;
						}
						.card-body {
							padding: 25px;
						}
						.subscription-link {
							margin-bottom: 12px;
						}
						.subscription-link a {
							color: var(--bs-primary);
							text-decoration: none;
							padding: 8px 15px;
							border-radius: 6px;
							background-color: rgba(63, 106, 216, 0.1);
							transition: all 0.3s ease;
							display: inline-block;
							font-weight: 500;
						}
						.subscription-link a:hover {
							background-color: var(--bs-primary);
							color: #fff;
							transform: translateX(5px);
						}
						.alert {
							border-radius: 8px;
							border: none;
							box-shadow: 0 2px 8px rgba(0,0,0,0.05);
						}
						.alert-info {
							background-color: rgba(63, 106, 216, 0.1);
							color: var(--bs-primary);
							border-left: 4px solid var(--bs-primary);
						}
						.alert-warning {
							background-color: #fff8e1;
							color: #856404;
							border-left: 4px solid #ffc107;
						}
						.btn {
							padding: 8px 16px;
							font-weight: 500;
							border-radius: 6px;
							transition: all 0.3s ease;
							text-transform: none;
							letter-spacing: 0.3px;
						}
						.btn-primary {
							background-color: var(--bs-primary);
							border-color: var(--bs-primary);
							box-shadow: 0 2px 6px rgba(63, 106, 216, 0.2);
						}
						.btn-primary:hover {
							background-color: var(--bs-primary-dark);
							border-color: var(--bs-primary-dark);
							transform: translateY(-1px);
							box-shadow: 0 4px 8px rgba(63, 106, 216, 0.3);
						}
						.progress {
							height: 8px;
							border-radius: 4px;
							background-color: rgba(0,0,0,0.05);
							overflow: hidden;
						}
						.progress-bar {
							border-radius: 4px;
							transition: width 0.6s ease;
						}
						.form-control {
							padding: 10px 15px;
							border-radius: 6px;
							border: 1px solid #e0e0e0;
							transition: all 0.3s ease;
							font-size: 14px;
						}
						.form-control:focus {
							border-color: var(--bs-primary);
							box-shadow: 0 0 0 3px rgba(63, 106, 216, 0.15);
						}
						.mt-4 a {
							color: #666;
							transition: color 0.3s ease;
						}
						.mt-4 a:hover {
							color: var(--bs-primary);
						}
						.editor-container {
							width: 100%;
							max-width: 100%;
							margin: 0 auto;
						}
						.editor {
							width: 100%;
							height: 300px;
							margin: 15px 0;
							padding: 10px;
							box-sizing: border-box;
							border: 1px solid #ccc;
							border-radius: 4px;
							font-size: 13px;
							line-height: 1.5;
							overflow-y: auto;
							resize: none;
						}
						.badge {
							display: inline-block;
							padding: 0.35em 0.65em;
							font-size: 0.75em;
							font-weight: 700;
							line-height: 1;
							text-align: center;
							white-space: nowrap;
							vertical-align: baseline;
							border-radius: 0.25rem;
						}
						.badge-primary {
							color: #fff;
							background-color: var(--bs-primary);
						}
						.save-status {
							color: #666;
							margin-left: 10px;
						}
						.qrcode-container {
							display: none;
							margin: 10px 0;
						}
						.traffic-settings {
							margin-top: 15px;
							padding: 15px;
							background-color: #f8f9fa;
							border-radius: 4px;
							border: 1px solid #eaeaea;
						}
						.traffic-title {
							margin-bottom: 15px;
							font-weight: 600;
						}
						.date-picker-container {
							margin-bottom: 10px;
						}
						.toast-container {
							position: fixed;
							top: 20px;
							right: 20px;
							z-index: 1050;
						}
						.toast {
							background: #fff;
							border-radius: 8px;
							box-shadow: 0 4px 12px rgba(0,0,0,0.15);
							margin-bottom: 10px;
							opacity: 0;
							transition: all 0.3s ease;
						}
						.toast.show {
							opacity: 1;
						}
						.toast.success {
							border-left: 4px solid var(--bs-success);
						}
						.toast.danger {
							border-left: 4px solid #dc3545;
						}
						.copy-tip {
							position: fixed;
							bottom: 20px;
							left: 50%;
							transform: translateX(-50%);
							background: rgba(0,0,0,0.8);
							color: #fff;
							padding: 8px 16px;
							border-radius: 4px;
							font-size: 14px;
							opacity: 0;
							transition: opacity 0.3s ease;
						}
						.copy-tip.show {
							opacity: 1;
						}
						.github-link {
							display: none;
						}
						@media (max-width: 768px) {
							.card-body {
								padding: 15px;
							}
							.subscription-link a {
								width: 100%;
								text-align: center;
							}
						}
					</style>
					<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
					<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
				</head>
				<body>
					<div class="container">
						<div class="card">
							<div class="card-header">
								<h3 class="mb-0">${FileName} 订阅配置</h3>
							</div>
							<div class="card-body">
								<div class="row">
									<div class="col-12">
										<div class="alert alert-info">
											点击链接自动 <strong>复制订阅链接</strong> 并 <strong>生成订阅二维码</strong>
										</div>
									</div>
								</div>
								
								<div class="card mb-3">
									<div class="card-header">
										<h5 class="mb-0">订阅链接</h5>
									</div>
									<div class="card-body">
										<div class="row g-3">
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sub','qrcode_0')">自适应订阅</a>
												</div>
												<div id="qrcode_0" class="qrcode-container"></div>
											</div>
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')">Base64订阅</a>
												</div>
												<div id="qrcode_1" class="qrcode-container"></div>
											</div>
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')">Clash订阅</a>
												</div>
												<div id="qrcode_2" class="qrcode-container"></div>
											</div>
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')">SingBox订阅</a>
												</div>
												<div id="qrcode_3" class="qrcode-container"></div>
											</div>
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')">Surge订阅</a>
												</div>
												<div id="qrcode_4" class="qrcode-container"></div>
											</div>
											<div class="col-md-4 col-sm-6">
												<div class="subscription-link">
													<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')">Loon订阅</a>
												</div>
												<div id="qrcode_5" class="qrcode-container"></div>
											</div>
										</div>
										
										<div class="mt-3">
											<button class="btn btn-outline-secondary btn-sm" id="noticeToggle" onclick="toggleNotice()">查看访客订阅 ▼</button>
											<div id="noticeContent" style="display: none;">
												<div class="mt-3 mb-2 alert alert-warning">
													访客订阅只能使用订阅功能，无法查看配置页！<br>
													GUEST（访客订阅TOKEN）: <strong>${guest}</strong>
												</div>
												
												<div class="row g-3">
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}','guest_0')">自适应订阅</a>
														</div>
													</div>
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&b64','guest_1')">Base64订阅</a>
														</div>
													</div>
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&clash','guest_2')">Clash订阅</a>
														</div>
													</div>
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&sb','guest_3')">SingBox订阅</a>
														</div>
													</div>
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&surge','guest_4')">Surge订阅</a>
														</div>
													</div>
													<div class="col-md-4 col-sm-6">
														<div class="subscription-link">
															<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&loon','guest_5')">Loon订阅</a>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								
								<div class="card mb-3">
									<div class="card-header">
										<h5 class="mb-0">流量设置</h5>
									</div>
									<div class="card-body">
										<div class="row g-3">
											<div class="col-md-4">
												<label for="totalTraffic" class="form-label">总流量 (TB)</label>
												<div class="input-group mb-3">
													<input type="number" class="form-control" id="totalTraffic" value="${currentTotal}">
													<span class="input-group-text">TB</span>
												</div>
											</div>
											<div class="col-md-4">
												<label for="expireDate" class="form-label">过期日期</label>
												<input type="date" class="form-control" id="expireDate" value="${expireDateFormatted}">
											</div>
											<div class="col-md-4">
												<label for="subscriptionDays" class="form-label">订阅周期天数</label>
												<div class="input-group mb-3">
													<input type="number" class="form-control" id="subscriptionDays" value="${currentSubscriptionDays}" min="1" max="365">
													<span class="input-group-text">天</span>
												</div>
											</div>
											<div class="col-12">
												<div class="alert alert-info">
													<div class="d-flex align-items-center mb-2">
														<div style="width: 100%">
															<div class="d-flex justify-content-between mb-1">
																<small>已用流量:</small>
																<small>${(usedBytes / 1099511627776).toFixed(2)} TB</small>
															</div>
															<div class="progress" style="height: 8px">
																<div class="progress-bar bg-info" role="progressbar" style="width: ${Math.min(100, (usedBytes / totalBytes) * 100).toFixed(2)}%" 
																	aria-valuenow="${Math.min(100, (usedBytes / totalBytes) * 100).toFixed(2)}" aria-valuemin="0" aria-valuemax="100"></div>
															</div>
														</div>
													</div>
													<div class="d-flex justify-content-between">
														<small>总计: ${total} TB</small>
														<small>剩余: ${(remainBytes / 1099511627776).toFixed(2)} TB</small>
													</div>
												</div>
											</div>
											<div class="col-12">
												<button type="button" class="btn btn-primary" onclick="saveTrafficSettings()">保存流量设置</button>
												<span id="trafficStatus" class="save-status"></span>
											</div>
										</div>
									</div>
								</div>
								
								<div class="card mb-3">
									<div class="card-header">
										<h5 class="mb-0">订阅转换配置</h5>
									</div>
									<div class="card-body">
										<div class="row">
											<div class="col-md-6">
												<p><strong>订阅转换后端:</strong> ${subProtocol}://${subConverter}</p>
											</div>
											<div class="col-md-6">
												<p><strong>配置文件:</strong> ${subConfig}</p>
											</div>
										</div>
									</div>
								</div>
								
								<div class="card">
									<div class="card-header">
										<h5 class="mb-0">${FileName} 汇聚订阅编辑</h5>
									</div>
									<div class="card-body">
										<div class="editor-container">
											${hasKV ? `
											<textarea class="editor form-control" 
												placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}"
												id="content">${content}</textarea>
											<div class="mt-3 d-flex align-items-center">
												<button class="btn btn-success" onclick="saveContent(this)">保存</button>
												<span class="save-status" id="saveStatus"></span>
											</div>
											` : '<div class="alert alert-warning">请绑定 <strong>变量名称</strong> 为 <strong>KV</strong> 的KV命名空间</div>'}
										</div>
									</div>
								</div>
								
								<div class="mt-4 text-center">
									<a href='https://github.com/cmliu/CF-Workers-SUB' class="github-link">
										<i class="bi bi-github"></i>
										<span>GitHub 项目地址</span>
									</a>
								</div>
								
								<div class="mt-3">
									<small>UA: <strong>${request.headers.get('User-Agent')}</strong></small>
								</div>
							</div>
						</div>
					</div>
				</body>
				<script>
				function showToast(message, type) {
					type = type || 'success';
					const toastContainer = document.getElementById('toast-container') || createToastContainer();
					const toast = document.createElement('div');
					toast.className = 'toast ' + type;
					toast.style.padding = '12px 20px';
					toast.style.minWidth = '250px';
					toast.textContent = message;
					
					toastContainer.appendChild(toast);
					setTimeout(function() {
						toast.classList.add('show');
					}, 10);
					
					setTimeout(function() {
						toast.classList.remove('show');
						setTimeout(function() {
							toastContainer.removeChild(toast);
						}, 300);
					}, 3000);
				}
					
				function createToastContainer() {
					const container = document.createElement('div');
					container.id = 'toast-container';
					container.className = 'toast-container';
					document.body.appendChild(container);
					return container;
				}
					
				function copyToClipboard(text) {
					navigator.clipboard.writeText(text).then(function() {
						showToast('已复制到剪贴板');
					}).catch(function(err) {
						console.error('复制失败:', err);
						showToast('复制失败，请手动复制', 'danger');
					});
				}
					
				function toggleNotice() {
					const noticeContent = document.getElementById('noticeContent');
					const noticeToggle = document.getElementById('noticeToggle');
					if (noticeContent.style.display === 'none' || noticeContent.style.display === '') {
						noticeContent.style.display = 'block';
						noticeToggle.textContent = '隐藏访客订阅 ▲';
					} else {
						noticeContent.style.display = 'none';
						noticeToggle.textContent = '查看访客订阅 ▼';
					}
				}
				
				if (document.querySelector('.editor')) {
					let timer;
					const textarea = document.getElementById('content');
					const originalContent = textarea.value;
		
					function replaceFullwidthColon() {
						const text = textarea.value;
						textarea.value = text.replace(/：/g, ':');
					}
					
					function saveContent(button) {
						try {
							const updateButtonText = function(step) {
								button.textContent = '保存中: ' + step;
							};
							// 检测是否为iOS设备
							const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
							
							// 仅在非iOS设备上执行replaceFullwidthColon
							if (!isIOS) {
								replaceFullwidthColon();
							}
							updateButtonText('开始保存');
							button.disabled = true;

							// 获取textarea内容和原始内容
							const textarea = document.getElementById('content');
							if (!textarea) {
								throw new Error('找不到文本编辑区域');
							}

							updateButtonText('获取内容');
							let newContent;
							let originalContent;
							try {
								newContent = textarea.value || '';
								originalContent = textarea.defaultValue || '';
							} catch (e) {
								console.error('获取内容错误:', e);
								throw new Error('无法获取编辑内容');
							}

							updateButtonText('准备状态更新函数');
							const updateStatus = function(message, isError) {
								isError = !!isError;
								const statusElem = document.getElementById('saveStatus');
								if (statusElem) {
									statusElem.textContent = message;
									statusElem.style.color = isError ? 'red' : '#666';
								}
							};

							updateButtonText('准备按钮重置函数');
							const resetButton = function() {
								button.textContent = '保存';
								button.disabled = false;
							};

							if (newContent !== originalContent) {
								updateButtonText('发送保存请求');
								fetch(window.location.href, {
									method: 'POST',
									body: newContent,
									headers: {
										'Content-Type': 'text/plain;charset=UTF-8'
									},
									cache: 'no-cache'
								})
								.then(function(response) {
									updateButtonText('检查响应状态');
									if (!response.ok) {
										throw new Error('HTTP error! status: ' + response.status);
									}
									updateButtonText('更新保存状态');
									const now = new Date().toLocaleString();
									document.title = '编辑已保存 ' + now;
									updateStatus('已保存 ' + now);
								})
								.catch(function(error) {
									updateButtonText('处理错误');
									console.error('Save error:', error);
									updateStatus('保存失败: ' + error.message, true);
								})
								.finally(function() {
									resetButton();
								});
							} else {
								updateButtonText('检查内容变化');
								updateStatus('内容未变化');
								resetButton();
							}
						} catch (error) {
							console.error('保存过程出错:', error);
							button.textContent = '保存';
							button.disabled = false;
							const statusElem = document.getElementById('saveStatus');
							if (statusElem) {
								statusElem.textContent = '错误: ' + error.message;
								statusElem.style.color = 'red';
							}
						}
					}
		
					textarea.addEventListener('blur', saveContent);
					textarea.addEventListener('input', () => {
						clearTimeout(timer);
						timer = setTimeout(saveContent, 5000);
					});
				}

				function generateQRCode(text, qrcodeId) {
					const qrcodeDiv = document.getElementById(qrcodeId);
					qrcodeDiv.innerHTML = '';
					new QRCode(qrcodeDiv, {
						text: text,
						width: 200,
						height: 200,
						colorDark: "#000000",
						colorLight: "#ffffff",
						correctLevel: QRCode.CorrectLevel.H
					});
					qrcodeDiv.style.display = 'block';
				}
				
				function toggleQR(qrcodeId) {
					const qrcodeDiv = document.getElementById(qrcodeId);
					if (qrcodeDiv.style.display === 'none' || qrcodeDiv.style.display === '') {
						qrcodeDiv.style.display = 'block';
					} else {
						qrcodeDiv.style.display = 'none';
					}
				}

				// 保存流量设置
				function saveTrafficSettings() {
					const totalTraffic = document.getElementById('totalTraffic').value;
					const expireDate = document.getElementById('expireDate').value;
					const subscriptionDays = document.getElementById('subscriptionDays').value;
					
					// 验证输入
					if (!totalTraffic || isNaN(parseInt(totalTraffic)) || parseInt(totalTraffic) <= 0) {
						showToast('请输入有效的流量数值', 'danger');
						return;
					}
					
					if (!expireDate) {
						showToast('请选择有效的过期日期', 'danger');
						return;
					}
					
					if (!subscriptionDays || isNaN(parseInt(subscriptionDays)) || parseInt(subscriptionDays) <= 0) {
						showToast('请输入有效的订阅周期天数', 'danger');
						return;
					}
					
					const timestamp = new Date(expireDate).getTime();
					if (isNaN(timestamp)) {
						showToast('无效的日期格式', 'danger');
						return;
					}
					
					// 显示保存中状态
					const statusElem = document.getElementById('trafficStatus');
					if (statusElem) statusElem.textContent = '保存中...';
					
					// 准备数据
					const data = {
						total: parseInt(totalTraffic),
						timestamp: timestamp,
						subscriptionDays: parseInt(subscriptionDays)
					};
					
					// 转换为JSON字符串
					const jsonData = JSON.stringify(data);
					
					console.log('准备发送流量设置数据:', jsonData);
					
					// 构造请求URL，确保不包含其他查询参数
					const currentUrl = new URL(window.location.href);
					// 移除所有现有的查询参数
					const cleanUrl = currentUrl.origin + currentUrl.pathname;
					// 添加updateTraffic参数
					const requestUrl = cleanUrl + '?updateTraffic=1';
					
					console.log('发送流量设置请求到URL:', requestUrl);
					
					// 发送请求保存设置
					fetch(requestUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json'
						},
						body: jsonData
					})
					.then(function(response) {
						console.log('流量设置响应状态:', response.status);
						return response.text().then(function(text) {
							console.log('流量设置响应内容:', text);
							// 检查响应文本是否为空
							if (!text || text.trim() === '') {
								console.error('服务器返回了空响应');
								return { success: false, message: '服务器返回了空响应' };
							}
							
							try {
								return JSON.parse(text);
							} catch (e) {
								console.error('解析响应JSON失败:', e, '响应文本:', text);
								return { success: false, message: '服务器响应格式错误' };
							}
						});
					})
					.then(function(data) {
						if (data.success) {
							console.log('流量设置更新成功:', data);
							showToast('流量设置已更新');
							if (statusElem) statusElem.textContent = '已更新 ' + new Date().toLocaleString();
						} else {
							console.error('流量设置更新失败:', data);
							showToast('更新失败: ' + (data.message || '未知错误'), 'danger');
							if (statusElem) statusElem.textContent = '更新失败 ' + new Date().toLocaleString();
						}
					})
					.catch(function(error) {
						console.error('保存流量设置出错:', error);
						showToast('更新失败: ' + error.message, 'danger');
						if (statusElem) statusElem.textContent = '更新失败 ' + new Date().toLocaleString();
					});
				}
		
				// 初始化页面
				document.addEventListener('DOMContentLoaded', function() {
					// 隐藏通知内容
					document.getElementById('noticeContent').style.display = 'none';
					
					// 格式化流量显示（防止科学计数法）
					var totalTrafficInput = document.getElementById('totalTraffic');
					if (totalTrafficInput) {
						// 保存原始值
						var originalValue = parseFloat(totalTrafficInput.value);
						console.log('原始流量值:', originalValue);
						
						if (isNaN(originalValue)) {
							console.error('流量值不是有效的数字:', totalTrafficInput.value);
							totalTrafficInput.value = '99'; // 设置默认值
						} else if (originalValue <= 0) {
							console.warn('流量值不能为负数或零:', originalValue);
							totalTrafficInput.value = '1';
						} else if (originalValue > 10000) {
							console.warn('流量值过大:', originalValue);
							totalTrafficInput.value = '10000';
						} else {
							// 使用toFixed确保显示为普通数字而非科学计数法
							totalTrafficInput.value = originalValue.toFixed(0);
						}
						
						// 添加事件监听器，防止输入框内容被自动转为科学计数法
						totalTrafficInput.addEventListener('change', function() {
							var value = parseFloat(this.value);
							if (isNaN(value)) {
								console.error('输入的流量值不是有效的数字:', this.value);
								this.value = '99';
							} else if (value <= 0) {
								console.warn('输入的流量值不能为负数或零:', value);
								this.value = '1';
							} else if (value > 10000) {
								console.warn('输入的流量值过大:', value);
								this.value = '10000';
							} else {
								this.value = value.toFixed(0);
							}
						});
					}
					
					// 检查并确保过期时间不早于当前时间
					var expireDateInput = document.getElementById('expireDate');
					if (expireDateInput) {
						var today = new Date();
						today.setHours(0, 0, 0, 0);
						var selectedDate = new Date(expireDateInput.value);
						
						if (selectedDate < today) {
							console.warn('过期日期早于当前日期，将设置为当前日期');
							var formattedToday = today.toISOString().split('T')[0];
							expireDateInput.value = formattedToday;
						}
						
						// 确保最早可选择的日期是今天
						expireDateInput.min = today.toISOString().split('T')[0];
					}
				});
				</script>
			</div>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}
