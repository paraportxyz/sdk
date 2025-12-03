.PHONY: install-root install-static install-core install-sdk install-react install-vue clean build build-static build-core build-sdk build-react build-vue

install: install-root install-static install-core install-sdk install-react install-vue
	@echo "✨ All packages installed successfully!"

clean:
	@echo "🧹 Cleaning node_modules directories..."
	@rm -rf node_modules
	@rm -rf packages/*/node_modules
	@echo "✨ All node_modules directories removed successfully!"

install-root:
	@echo "📦 Installing root dependencies..."
	pnpm install

install-static:
	@echo "📦 Installing static package dependencies..."
	cd packages/static && pnpm install
	@echo "🔧 Setting up endpoint generator..."

install-core:
	@echo "📦 Installing core package dependencies..."
	cd packages/core && pnpm install

install-vue:
	@echo "📦 Installing Vue package dependencies..."
	cd packages/vue && pnpm install

install-sdk:
	@echo "📦 Installing SDK package dependencies..."
	cd packages/sdk && pnpm install

install-react:
	@echo "📦 Installing React package dependencies..."
	cd packages/react && pnpm install

build: build-static build-core build-sdk build-react build-vue
	@echo "✨ All packages built successfully!"

build-static:
	@echo "🏗️ Building static package..."
	cd packages/static && pnpm build

build-core:
	@echo "🏗️ Building core package..."
	cd packages/core && pnpm build

build-sdk:
	@echo "🏗️ Building SDK package..."
	cd packages/sdk && pnpm build

build-react:
	@echo "🏗️ Building React package..."
	cd packages/react && pnpm build

build-vue:
	@echo "🏗️ Building Vue package..."
	cd packages/vue && pnpm build

dev-playground:
	@echo "🚀 Starting playground..."
	cd apps/playground && pnpm run dev
