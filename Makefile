# Makefile ap_pl_project.
#
# Dev:  make setup && make dev  → http://localhost:5178/ap_pl_project/
# Prod: Docker Compose на webtest, домен crmakyfon.constrtodo.ru (deploy/README.md).

SHELL := /bin/bash

.PHONY: help setup install dev build lint \
        deploy-bootstrap deploy-frontend \
        deploy-nginx-sync deploy-nginx-reload deploy-status deploy-logs

.DEFAULT_GOAL := help

help: ## Показать список команд
	@echo "Команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

setup: install ## Первая инициализация
	@echo "✓ Готово. Запустите: make dev (нужен ConstrTodo на :3005)"

install: ## Установить зависимости
	npm install

dev: ## Запустить vite
	npm run dev

build: ## Production-сборка
	npm run build

lint: ## Проверка кода
	npm run lint

# ─── prod deploy (SSH + Docker Compose) ─────────────────────────────────────
# Требуется deploy/.env.deploy (копия из deploy/.env.deploy.example).
# Сборка идёт на сервере внутри образа — локальный Node не нужен.

deploy-bootstrap: ## Первый запуск на сервере (clone + up --build)
	bash deploy/bootstrap.sh

deploy-frontend: ## Роллаут фронта. REV=<commit>
	bash deploy/deploy-frontend.sh

deploy-nginx-sync: ## Залить nginx server block и валидировать nginx -t (нужен sudo)
	bash deploy/deploy-nginx-sync.sh

deploy-nginx-reload: ## nginx -t && systemctl reload nginx (нужен sudo)
	bash deploy/deploy-nginx-reload.sh

deploy-status: ## Состояние прод-стека
	bash deploy/deploy-status.sh

deploy-logs: ## Логи контейнера. TAIL=500 FOLLOW=1
	bash deploy/deploy-logs.sh
