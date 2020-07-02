var plugin = requirePlugin('loopsdk');

Page({
	data: {
		device: {},
		devices: [],
		loopSdk: null,
		version: '',
		is_init: false,
		is_connect: false,
		is_start: false,
		ready: false,
		count: 0,

		timer: null,
		time: ''
	},
	onLoad: function () {
		this.loopSdk = new plugin.LoopSDK();

		// 搜索到新设备
		this.loopSdk.on('found', devices => {
			this.setData({ devices });
		});

		// 蓝牙关闭
		this.loopSdk.on('close', state => {
			clearInterval(this.data.timer);
			this.setData({ is_init: false, devices: [], is_connect: false, version: '', ready: false, count: 0 });
			wx.hideLading();
			wx.showModal({ content: '蓝牙已关闭', showCancel: false });
		});

		// 蓝牙断开连接
		this.loopSdk.on('disconnect', state => {
			clearInterval(this.data.timer);
			this.setData({ devices: [], is_connect: false, version: '', ready: false, count: 0 });
			wx.showModal({ content: '蓝牙已断开', showCancel: false });
		});

		// 设备初始化
		this.loopSdk.on('device_init', info => {
			clearInterval(this.data.timer);
			// info => version, manuf
			this.setData({ version: info.version, ready: false, count: 0 });
			wx.showToast({ title: '设备初始化成功' });
		});

		// 设备就绪
		this.loopSdk.on('device_ready', info => {
			clearInterval(this.data.timer);
			if (info.ready === true) {
				this.setData({ ready: true, count: 0 });
				wx.showToast({ title: '设备已准备就绪' });
			}
		});

		// 设备数据
		this.loopSdk.on('device_data', info => {
			// info => count, time, times
			this.setData({ count: info.count });
		});
	},
	async init() {
		try {
			await this.loopSdk.init();

			this.setData({ is_init: true });

			this.search();

			wx.showToast({ title: '蓝牙初始化成功' });
		} catch ({ message: content }) {
			wx.showModal({ content, showCancel: false });
		}
	},
	async search() {
		try {
			await this.loopSdk.startSearch();
		} catch ({ message: content }) {
			wx.showModal({ content, showCancel: false });
		}
	},
	async connect(event) {
		try {
			wx.showLoading({ title: '正在连接...', mask: true });

			const device = event.currentTarget.dataset.device;

			await this.loopSdk.connect(device);

			await this.loopSdk.stopSearch();

			this.setData({ is_connect: true, device });

			wx.showToast({ title: '连接成功' });
		} catch ({ message: title }) {
			wx.showToast({ title, icon: 'none' });
		}
	},
	async send(event) {
		try {
			await this.loopSdk.send(event);
		} catch ({ message: content }) {
			wx.showModal({ content, showCancel: false });
		}
	},
	async disconnect() {
		if (this.data.is_start === true) {
			return wx.showToast({ title: '请先结束运动', icon: 'none' });
		}
		wx.showModal({
			title: '提示',
			content: `设备:${this.data.device.name}`,
			cancelText: '取消',
			confirmText: '断开连接',
			success: () => {
				this.loopSdk.disconnect();
			}
		});
	},
	bleRequestStart() {
		this.send('start');
	},
	bleReadyCount() {
		this.send('readyCount');
		this.setData({ time: 0 });
		this.setData({ is_start: false });
	},
	bleRequestCount() {
		if (this.data.is_start) {
			return;
		}
		this.send('count');
		this.setData({ time: 0 });
		this.setData({ is_start: true });
		this.data.timer = setInterval(() => {
			this.send('count');
			this.setData({ time: ++this.data.time });
		}, 1000);
	},
	bleRequestCountEnd() {
		this.send('countEnd');
		this.setData({ is_start: false });
		clearInterval(this.data.timer);
	},
	bleRequestEffect() {
		this.send('effect');
	}
});
