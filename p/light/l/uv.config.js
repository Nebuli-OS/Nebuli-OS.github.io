self.__uv$config = {
	prefix: "/p/light/light/",
	bare: localStorage.getItem("bare") || "https://larp.foundation/tspmo/",
	encodeUrl: Ultraviolet.codec.xor.encode,
	decodeUrl: Ultraviolet.codec.xor.decode,
	handler: "/p/light/l/uv.handler.js",
	bundle: "/p/light/l/uv.bundle.js",
	config: "/p/light/l/uv.config.js",
	sw: "/p/light/l/uv.sw.js",
};
