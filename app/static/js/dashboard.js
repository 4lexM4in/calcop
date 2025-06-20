// Общие функции для dashboard

// Функция обновления поля комментария при изменении чекбокса
function updateCommentsField(checkbox) {
    const row = checkbox.closest('tr');
    const commentField = row.querySelector('.comment-field');
    
    if (!checkbox.checked) {
        commentField.value = "Не участвует в расчете нагрузки";
        commentField.setAttribute('readonly', 'readonly');
        row.classList.add('has-background-grey-lighter');
    } else {
        if (commentField.value === "Не участвует в расчете нагрузки") {
            commentField.value = "";
        }
        commentField.removeAttribute('readonly');
        row.classList.remove('has-background-grey-lighter');
    }
}

// Функция показа уведомления
function showNotification(message, type = 'is-info') {
    const flashMessages = document.getElementById('flash-messages');
    
    const notification = document.createElement('div');
    notification.className = `notification flash-message ${type}`;
    notification.setAttribute('data-autodismiss', '');
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.addEventListener('click', () => {
        notification.parentNode.removeChild(notification);
    });
    
    notification.appendChild(deleteButton);
    notification.appendChild(document.createTextNode(message));
    
    flashMessages.appendChild(notification);
    
    // Автоматическое исчезновение уведомления
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Функция для загрузки настроек коэффициента затратности
function loadCostCoefficientSettings() {
    return fetch('/settings/api/settings')
        .then(response => {
            if (!response.ok) {
                return {}; // Возвращаем пустой объект в случае ошибки
            }
            return response.json();
        })
        .catch(error => {
            console.error('Ошибка загрузки настроек:', error);
            return {'КоэффициентЗатратности': 15}; // Дефолтное значение
        });
}

// Функция проверки коэффициента затратности
function checkCostCoefficient(currentCoefficient, settings) {
    const minCoefficient = parseFloat(settings.КоэффициентЗатратности || 15);
    
    // Обновляем элемент с минимальным значением
    const minCoefficientElement = document.getElementById('min-coefficient');
    if (minCoefficientElement) {
        minCoefficientElement.textContent = minCoefficient;
    }
    
    // Проверяем, меньше ли текущий коэффициент минимального
    const costCoefficientValue = document.getElementById('cost-coefficient-value');
    const costCoefficientText = document.getElementById('cost-coefficient-text');
    const tooltipIcon = document.querySelector('#cost-coefficient-tooltip .tooltip-icon i');
    
    if (currentCoefficient < minCoefficient) {
        // Красный цвет для недостаточного коэффициента
        if (costCoefficientValue) {
            costCoefficientValue.classList.remove('has-text-dark', 'has-text-success');
            costCoefficientValue.classList.add('has-text-danger');
        }
        
        if (costCoefficientText) {
            costCoefficientText.textContent = `Не соответствует норме (должно быть ≥ ${minCoefficient})`;
        }
        
        if (tooltipIcon) {
            tooltipIcon.className = 'fas fa-exclamation';
        }
    } else {
        // Зеленый цвет для нормального коэффициента
        if (costCoefficientValue) {
            costCoefficientValue.classList.remove('has-text-dark', 'has-text-danger');
            costCoefficientValue.classList.add('has-text-success');
        }
        
        if (costCoefficientText) {
            costCoefficientText.textContent = `Соответствует норме (≥ ${minCoefficient})`;
        }
        
        if (tooltipIcon) {
            tooltipIcon.className = 'fas fa-check';
        }
    }
}

// Функция обновления карточек с итоговыми результатами
function updateSummaryCards(totalWorkload, contingent, normHours) {
    // Находим карточку с суммой нагрузки
    const cards = document.querySelectorAll('.card .card-content .title.is-3');
    cards.forEach(card => {
        const heading = card.parentElement.querySelector('.heading');
        if (heading && heading.textContent === 'Сумма нагрузки') {
            card.textContent = totalWorkload.toFixed(2);
        }
    });
    
    // Рассчитываем новое количество ставок
    const positions = totalWorkload / normHours;
    
    // Обновляем карточку количества ставок
    cards.forEach(card => {
        const heading = card.parentElement.querySelector('.heading');
        if (heading && heading.textContent === 'Количество ставок') {
            card.textContent = positions.toFixed(2);
        }
    });
    
    // Рассчитываем новый коэффициент затратности
    const costCoefficient = (contingent * normHours) / totalWorkload;
    
    // Обновляем карточку коэффициента затратности
    const costCoefficientValue = document.getElementById('cost-coefficient-value');
    
    if (costCoefficientValue) {
        // Убираем тултип и обновляем значение
        const tooltipContainer = costCoefficientValue.querySelector('.tooltip-container');
        costCoefficientValue.innerHTML = costCoefficient.toFixed(2);
        if (tooltipContainer) {
            costCoefficientValue.appendChild(tooltipContainer);
        }
        
        // Загружаем настройки для проверки нового коэффициента
        loadCostCoefficientSettings()
            .then(data => {
                checkCostCoefficient(costCoefficient, data);
                
                const costCoefficientTooltip = document.getElementById('cost-coefficient-tooltip');
                if (costCoefficientTooltip) {
                    costCoefficientTooltip.style.display = 'inline-block';
                }
            });
    }
}

// Функция управления модальными окнами удаления
function initializeDeleteModal() {
    const deleteModalBackdrop = document.getElementById('delete-confirm-modal-backdrop');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    
    if (!deleteModalBackdrop) return;
    
    // ID расчета для удаления
    let workloadIdToDelete = null;
    
    // Функция открытия модального окна подтверждения удаления
    window.confirmDelete = function(workloadId, workloadTitle) {
        workloadIdToDelete = workloadId;
        document.getElementById('delete-workload-title').textContent = workloadTitle;
        deleteModalBackdrop.classList.add('is-active');
    };
    
    // Функция закрытия модального окна подтверждения удаления
    function closeDeleteModal() {
        deleteModalBackdrop.classList.remove('is-active');
    }
    
    // Обработчик отмены удаления
    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', closeDeleteModal);
    }
    
    // Обработчик подтверждения удаления
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', function() {
            if (workloadIdToDelete) {
                // Отправляем запрос на удаление
                fetch(`/workload/delete/${workloadIdToDelete}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Закрываем модальное окно
                        closeDeleteModal();
                        
                        // Показываем сообщение об успешном удалении
                        showNotification('Расчет успешно удален', 'is-success');
                        
                        // Определяем, на какую страницу перенаправить
                        const currentPath = window.location.pathname;
                        if (currentPath.includes('/workload/view/')) {
                            // Если мы на странице просмотра, переходим к списку
                            setTimeout(() => {
                                window.location.href = "/workload/my-workloads";
                            }, 1500);
                        } else {
                            // Если мы на списке, перезагружаем страницу
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        }
                    } else {
                        showNotification('Ошибка при удалении расчета: ' + (data.error || 'Неизвестная ошибка'), 'is-danger');
                    }
                })
                .catch(error => {
                    console.error('Ошибка при удалении расчета:', error);
                    showNotification('Ошибка при удалении расчета', 'is-danger');
                });
            }
        });
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем модальное окно удаления
    initializeDeleteModal();
});