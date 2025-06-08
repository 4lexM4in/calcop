from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify, send_file
from app.controllers.auth_controller import login_required
from app.models.saved_workload import SavedWorkload
from app.models.settings import Settings
from app.models.norms import Norms
from app.models.formulas import Formula
from app.services.formula_executor import FormulaExecutor
import pandas as pd
from io import BytesIO
import json

workload_bp = Blueprint('workload', __name__, url_prefix='/workload')

@workload_bp.route('/save', methods=['POST'])
@login_required
def save_workload():
    """Сохранение расчета нагрузки в личный кабинет"""
    user_dict = session.get('user', {})
    user_id = user_dict.get('id')
    
    if not user_id:
        flash('Пожалуйста, авторизуйтесь для сохранения расчета', 'error')
        return redirect(url_for('auth.login'))
    
    # Получаем данные из формы
    title = request.form.get('workload_title', 'Расчёт нагрузки')
    comment = request.form.get('workload_comment', '')
    
    # Получаем данные из сессии (последний расчет)
    calculated_data = session.get('calculated_data', [])
    workload_summary = session.get('workload_summary', {})
    program_info = session.get('program_info', {})
    contingent = session.get('contingent', 0)
    course = session.get('course', None)
    
    # Собираем все данные в один словарь
    data = {
        'calculated_data': calculated_data,
        'workload_summary': workload_summary,
        'program_info': program_info,
        'contingent': contingent,
        'course': course
    }
    
    try:
        # Сохраняем расчет в БД
        workload_id = SavedWorkload.save_workload(user_id, title, data, comment)
        
        # Очищаем данные из сессии после успешного сохранения
        session.pop('calculated_data', None)
        session.pop('workload_summary', None)
        session.pop('program_info', None)
        session.pop('contingent', None)
        session.pop('course', None)
        session.modified = True  # Помечаем сессию как измененную
        
        flash(f'Расчет "{title}" успешно сохранен', 'success')
        return redirect(url_for('workload.my_workloads'))
    except Exception as e:
        flash(f'Ошибка при сохранении расчета: {str(e)}', 'error')
        return redirect(url_for('main.index'))

@workload_bp.route('/my-workloads')
@login_required
def my_workloads():
    """Страница со списком сохраненных расчетов"""
    user_dict = session.get('user', {})
    user_id = user_dict.get('id')
    
    # Получаем сохраненные расчеты пользователя
    workloads = SavedWorkload.get_user_workloads(user_id)
    
    # Загружаем настройки для боковой панели
    settings = Settings.get_all_settings()
    
    return render_template('dashboard/workload/my_workloads.html', 
                           user=user_dict, 
                           workloads=workloads,
                           settings=settings)

@workload_bp.route('/view/<int:workload_id>')
@login_required
def view_workload(workload_id):
    """Просмотр сохраненного расчета нагрузки"""
    user_dict = session.get('user', {})
    
    # Получаем данные расчета с включением скрытых строк
    workload_data = SavedWorkload.get_workload_by_id(workload_id, include_hidden=True)
    
    if not workload_data:
        flash('Расчет не найден', 'error')
        return redirect(url_for('workload.my_workloads'))
    
    # Загружаем настройки для боковой панели
    settings = Settings.get_all_settings()
    
    return render_template('dashboard/workload/view_workload.html',
                           user=user_dict,
                           program_info=workload_data.get('program_info', {}),
                           workload_summary=workload_data.get('workload_summary', {}),
                           calculated_data=workload_data.get('calculated_data', []),
                           workload=workload_data,
                           contingent=workload_data.get('contingent', 0),
                           settings=settings)

@workload_bp.route('/delete/<int:workload_id>', methods=['POST'])
@login_required
def delete_workload(workload_id):
    """Удаление сохраненного расчета"""
    user_dict = session.get('user', {})
    user_id = user_dict.get('id')
    
    # Проверяем права пользователя
    workload_data = SavedWorkload.get_workload_by_id(workload_id)
    
    if not workload_data:
        return jsonify({'success': False, 'error': 'Расчет не найден'})
    
    if workload_data['user_id'] != user_id and not user_dict.get('is_admin', False):
        return jsonify({'success': False, 'error': 'У вас нет прав на удаление этого расчета'})
    
    # Удаляем расчет
    success = SavedWorkload.delete_workload(workload_id)
    
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Ошибка при удалении расчета'})

@workload_bp.route('/get_full_data/<int:workload_id>')
@login_required
def get_full_data(workload_id):
    """Получение полных данных расчета (включая скрытые строки)"""
    workload_data = SavedWorkload.get_workload_by_id(workload_id, include_hidden=True)
    
    if not workload_data:
        return jsonify({'success': False, 'error': 'Расчет не найден'})
    
    return jsonify({
        'success': True,
        'calculated_data': workload_data.get('calculated_data', [])
    })

@workload_bp.route('/recalculate/<int:workload_id>', methods=['POST'])
@login_required
def recalculate_workload(workload_id):
    """Пересчет нагрузки с новыми параметрами"""
    try:
        # Получаем существующий расчет
        workload_data = SavedWorkload.get_workload_by_id(workload_id)
        
        if not workload_data:
            return jsonify({'success': False, 'error': 'Расчет не найден'})
        
        # Получаем данные из формы
        form_data = request.form.to_dict()
        
        # Получаем нормы из БД
        norms_data = Norms.get_all_norms()
        norms = {norm['name']: norm['value'] for norm in norms_data}
        
        # Получаем формулы из БД
        formulas = Formula.get_all_formulas()
        
        # Обновляем данные расчета из формы
        calculated_data = workload_data.get('calculated_data', [])
        
        # Обработка данных формы и пересчет
        total_workload = 0
        total_zet_hours = 0
        total_credits = 0
        
        for row in calculated_data:
            row_id = f"{row['Индекс дисциплины']}_{row['Вид работы']}_{row['Семестр']}"
            
            # Обновляем данные из формы
            if f'consider_{row_id}' in form_data:
                row['Учитывать'] = form_data.get(f'consider_{row_id}', 'off') == 'on'
            
            if row['Учитывать']:
                # Обновляем параметры из формы
                if f'contingent_{row_id}' in form_data:
                    row['Контингент по дисциплине'] = int(form_data.get(f'contingent_{row_id}', 1))
                if f'stream_{row_id}' in form_data:
                    row['Численность потока'] = int(form_data.get(f'stream_{row_id}', 1))
                if f'subgroups_{row_id}' in form_data:
                    row['Количество подгрупп'] = int(form_data.get(f'subgroups_{row_id}', 1))
                if f'with_ppe_{row_id}' in form_data:
                    row['С непосредственным участием ППС'] = form_data.get(f'with_ppe_{row_id}', 'off')
                
                # Пересчитываем нагрузку
                workload = FormulaExecutor.calculate_workload(row, norms, formulas)
                order_point = FormulaExecutor.get_order_point(row, formulas)
                
                row['Нагрузка'] = workload
                row['Пункт приказа'] = order_point
                
                total_workload += workload
                
                # Учитываем кредиты для дисциплин
                if row['Вид работы'] in ['Лекционные занятия', 'Практические занятия', 'Лабораторные занятия']:
                    zet_value = row.get('ЗЕТ')
                    if zet_value is not None and zet_value != '':
                        try:
                            total_credits += float(zet_value)
                        except (ValueError, TypeError):
                            pass  # Игнорируем невалидные значения
                
                # Подсчет часов ЗЕТ
                if row['Вид работы'] == 'Руководство (ЗЕТ)':
                    hours_value = row.get('Часы')
                    if hours_value is not None and hours_value != '':
                        try:
                            total_zet_hours += float(hours_value)
                        except (ValueError, TypeError):
                            pass  # Игнорируем невалидные значения
            else:
                row['Нагрузка'] = 0
                row['Пункт приказа'] = ""
        
        # Обновляем итоговые показатели
        norm_hours_per_position = float(norms.get('Норма времени на одну штатную единицу', 900))
        calculated_positions = round(total_workload / norm_hours_per_position, 2)
        contingent = workload_data.get('contingent', 1)
        cost_coefficient = round((contingent * norm_hours_per_position) / total_workload, 2) if total_workload > 0 else 0
        
        workload_summary = {
            'total_workload': round(total_workload, 2),
            'calculated_positions': calculated_positions,
            'cost_coefficient': cost_coefficient,
            'total_credits': round(total_credits, 2),
            'total_zet_hours': round(total_zet_hours, 2),
            'norm_hours_per_position': norm_hours_per_position,
            'zet_hours_warning': total_zet_hours > 60
        }
        
        # Обновляем данные в рабочей структуре
        updated_data = {
            'calculated_data': calculated_data,
            'workload_summary': workload_summary,
            'program_info': workload_data.get('program_info', {}),
            'contingent': contingent,
            'course': workload_data.get('course', None)
        }
        
        # Временно сохраняем пересчитанные данные в базу данных
        # чтобы они были доступны через API get_full_data
        SavedWorkload.update_workload(workload_id, updated_data)
        
        # Возвращаем успешный результат
        return jsonify({'success': True})
    except Exception as e:
        import traceback
        print(f"Ошибка при пересчете: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})

@workload_bp.route('/update/<int:workload_id>', methods=['POST'])
@login_required
def update_workload(workload_id):
    """Обновление расчета нагрузки с новыми данными"""
    user_dict = session.get('user', {})
    user_id = user_dict.get('id')
    
    try:
        # Получаем существующий расчет с включением скрытых строк
        workload_data = SavedWorkload.get_workload_by_id(workload_id, include_hidden=True)
        
        if not workload_data:
            return jsonify({'success': False, 'error': 'Расчет не найден'})
        
        # Проверяем права пользователя
        if workload_data['user_id'] != user_id and not user_dict.get('is_admin', False):
            return jsonify({'success': False, 'error': 'У вас нет прав на редактирование этого расчета'})
        
        # Получаем данные из формы
        form_data = request.form.to_dict()
        
        # Получаем нормы из БД
        norms_data = Norms.get_all_norms()
        norms = {norm['name']: norm['value'] for norm in norms_data}
        
        # Получаем формулы из БД
        formulas = Formula.get_all_formulas()
        
        # Обновляем данные расчета из формы
        calculated_data = workload_data.get('calculated_data', [])
        
        # Обработка данных формы и пересчет
        total_workload = 0
        total_zet_hours = 0
        total_credits = 0
        
        for row in calculated_data:
            row_id = f"{row['Индекс дисциплины']}_{row['Вид работы']}_{row['Семестр']}"
            
            # Обновляем данные из формы
            if f'consider_{row_id}' in form_data:
                was_considered = row.get('Учитывать', True)
                row['Учитывать'] = form_data.get(f'consider_{row_id}', 'off') == 'on'
                
                # Если снята галочка "Учитывать", автоматически устанавливаем комментарий
                if was_considered and not row['Учитывать']:
                    row['Комментарии'] = "Не участвует в расчете нагрузки"
                elif not was_considered and row['Учитывать']:
                    # Если галочка поставлена обратно, очищаем комментарий
                    if row.get('Комментарии') == "Не участвует в расчете нагрузки":
                        row['Комментарии'] = ""
            
            if row['Учитывать']:
                # Обновляем параметры из формы
                if f'contingent_{row_id}' in form_data:
                    row['Контингент по дисциплине'] = int(form_data.get(f'contingent_{row_id}', 1))
                if f'stream_{row_id}' in form_data:
                    row['Численность потока'] = int(form_data.get(f'stream_{row_id}', 1))
                if f'subgroups_{row_id}' in form_data:
                    row['Количество подгрупп'] = int(form_data.get(f'subgroups_{row_id}', 1))
                if f'with_ppe_{row_id}' in form_data:
                    row['С непосредственным участием ППС'] = form_data.get(f'with_ppe_{row_id}', 'off')
                if f'comment_{row_id}' in form_data:
                    # Обновляем комментарий только если это не автоматический комментарий
                    if row.get('Комментарии') != "Не участвует в расчете нагрузки":
                        row['Комментарии'] = form_data.get(f'comment_{row_id}', '')
                
                # Пересчитываем нагрузку
                workload = FormulaExecutor.calculate_workload(row, norms, formulas)
                order_point = FormulaExecutor.get_order_point(row, formulas)
                
                row['Нагрузка'] = workload
                row['Пункт приказа'] = order_point
                
                total_workload += workload
                
                # Учитываем кредиты для дисциплин
                if row['Вид работы'] in ['Лекционные занятия', 'Практические занятия', 'Лабораторные занятия']:
                    total_credits += float(row['ЗЕТ']) if row.get('ЗЕТ') else 0
                
                # Подсчет часов ЗЕТ
                if row['Вид работы'] == 'Руководство (ЗЕТ)':
                    hours = float(row['Часы']) if row.get('Часы') else 0
                    total_zet_hours += hours
            else:
                row['Нагрузка'] = 0
                row['Пункт приказа'] = ""
                if f'comment_{row_id}' in form_data:
                    comment_value = form_data.get(f'comment_{row_id}', '')
                    if comment_value != "Не участвует в расчете нагрузки":
                        row['Комментарии'] = comment_value
        
        # Обновляем итоговые показатели
        norm_hours_per_position = float(norms.get('Норма времени на одну штатную единицу', 900))
        calculated_positions = round(total_workload / norm_hours_per_position, 2)
        contingent = workload_data.get('contingent', 1)
        cost_coefficient = round((contingent * norm_hours_per_position) / total_workload, 2) if total_workload > 0 else 0
        
        workload_summary = {
            'total_workload': round(total_workload, 2),
            'calculated_positions': calculated_positions,
            'cost_coefficient': cost_coefficient,
            'total_credits': round(total_credits, 2),
            'total_zet_hours': round(total_zet_hours, 2),
            'norm_hours_per_position': norm_hours_per_position,
            'zet_hours_warning': total_zet_hours > 60
        }
        
        # Обновляем данные для сохранения
        updated_data = {
            'calculated_data': calculated_data,
            'workload_summary': workload_summary,
            'program_info': workload_data.get('program_info', {}),
            'contingent': contingent,
            'course': workload_data.get('course', None)
        }
        
        # Обновляем расчет в БД
        success = SavedWorkload.update_workload(workload_id, updated_data)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Ошибка при обновлении расчета'})
        
    except Exception as e:
        import traceback
        print(f"Ошибка при обновлении расчета: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)})

@workload_bp.route('/export_excel/<int:workload_id>', methods=['GET'])
@login_required
def export_excel_saved(workload_id):
    """Экспорт сохраненного расчета в Excel"""
    # Получаем данные расчета
    workload_data = SavedWorkload.get_workload_by_id(workload_id, include_hidden=True)
    
    if not workload_data:
        flash('Расчет не найден', 'error')
        return redirect(url_for('workload.my_workloads'))
    
    # Передаем данные в функцию экспорта
    return export_to_excel(
        workload_data.get('calculated_data', []),
        workload_data.get('workload_summary', {}),
        workload_data.get('program_info', {}),
        workload_data.get('contingent', 0)
    )


@workload_bp.route('/export_excel_current', methods=['POST'])
@login_required
def export_excel_current():
    """Экспорт текущего расчета (несохраненного) в Excel"""
    # Получаем данные из формы
    form_data = request.form.to_dict()
    
    # Получаем данные из сессии
    calculated_data = session.get('calculated_data', [])
    workload_summary = session.get('workload_summary', {})
    program_info = session.get('program_info', {})
    contingent = session.get('contingent', 0)
    
    # Если данных нет в сессии, возвращаем ошибку
    if not calculated_data:
        flash('Нет данных для экспорта. Выполните расчет нагрузки.', 'error')
        return redirect(url_for('main.index'))
    
    return export_to_excel(calculated_data, workload_summary, program_info, contingent)


def export_to_excel(calculated_data, workload_summary, program_info, contingent):
    """Функция экспорта данных в Excel - версия без перезаписи значений"""
    
    # Отладочная информация для проверки значений
    print(f"DEBUG: total_workload = {workload_summary.get('total_workload', 0)}")
    print(f"DEBUG: total_zet_hours = {workload_summary.get('total_zet_hours', 0)}")
    
    # Определение столбцов для экспорта
    columns_to_include = [
        'Индекс дисциплины', 'Дисциплина', 'Название кафедры', 'Вид работы', 'Курс',
        'Семестр', 'Часы', 'Контингент по дисциплине', 'Численность потока',
        'Количество подгрупп', 'Нагрузка', 'Пункт приказа', 'Комментарии'
    ]
    
    # Подготовка данных для DataFrame
    filtered_data = []
    for row in calculated_data:
        if row.get('Учитывать', True):  # Включаем только учитываемые строки
            filtered_row = {
                'Индекс дисциплины': row.get('Индекс дисциплины', ''),
                'Дисциплина': row.get('Дисциплина', ''),
                'Название кафедры': row.get('Название кафедры', ''),
                'Вид работы': row.get('Вид работы', ''),
                'Курс': row.get('Курс', ''),
                'Семестр': row.get('Семестр', ''),
                'Часы': row.get('Часы', 0),
                'Контингент по дисциплине': row.get('Контингент по дисциплине', 0),
                'Численность потока': row.get('Численность потока', 0),
                'Количество подгрупп': row.get('Количество подгрупп', 1),
                'Нагрузка': row.get('Нагрузка', 0),
                'Пункт приказа': row.get('Пункт приказа', ''),
                'Комментарии': row.get('Комментарии', '')
            }
            filtered_data.append(filtered_row)
    
    # Создание DataFrame из данных
    df = pd.DataFrame(filtered_data, columns=columns_to_include)
    
    # Преобразование столбца 'Нагрузка' в числовой формат
    df['Нагрузка'] = pd.to_numeric(df['Нагрузка'], errors='coerce')
    
    # Получаем минимальное значение коэффициента из настроек
    settings = Settings.get_all_settings()
    min_coefficient = float(settings.get('КоэффициентЗатратности', 15))
    
    # Формирование summary_items с КОММЕНТАРИЯМИ
    summary_items = []
    
    # Нормы и расчетные показатели
    summary_items.extend([
        ("Норма времени на одну штатную единицу", workload_summary.get('norm_hours_per_position', 900), ""),
        ("Коэффициент затратности (соотношение Контингент/ППС)", 
         workload_summary.get('cost_coefficient', 0),
         f"Соответствует норме (>= {min_coefficient})" if workload_summary.get('cost_coefficient', 0) >= min_coefficient 
         else f"Не соответствует норме (должно быть >= {min_coefficient})"),
        ("Расчетное количество ставок", workload_summary.get('calculated_positions', 0), ""),
        ("Контингент", contingent, ""),
        ("Сумма нагрузки", workload_summary.get('total_workload', 0), ""),
        ("Трудоемкость (часов ЗЕТ)", 
         workload_summary.get('total_zet_hours', 0),
         "Соответствует норме (60 часов)" if workload_summary.get('total_zet_hours', 0) == 60 
         else "Должно быть 60 часов")
    ])
    
    # Создание DataFrame для summary с тремя колонками
    summary_df = pd.DataFrame(summary_items, columns=["Название", "Значение", "Комментарий"])
    
    # Формирование program_info_items
    program_info_items = [
        ("Учебный год", program_info.get('academic_year', ''), ""),
        ("Год набора", program_info.get('admission_year', ''), ""),
        ("Специальность", program_info.get('specialty', ''), ""),
        ("Профиль", program_info.get('profile', ''), ""),
        ("Квалификация", program_info.get('qualification', ''), ""),
        ("Форма обучения", program_info.get('education_form', ''), "")
    ]
    
    program_info_df = pd.DataFrame(program_info_items, columns=["Название", "Значение", "Комментарий"])
    
    # Объединение program_info и summary
    combined_info_df = pd.concat([program_info_df, summary_df], ignore_index=True)
    
    # Отладочная информация для проверки содержимого combined_info_df
    print("=== ОТЛАДКА EXCEL ===")
    print("Содержимое combined_info_df:")
    for idx, row in combined_info_df.iterrows():
        print(f"  Строка {idx}: '{row['Название']}' = {row['Значение']} | Комментарий: '{row['Комментарий']}'")
    print("=== КОНЕЦ ОТЛАДКИ EXCEL ===")
    
    # Создание объекта BytesIO для сохранения Excel-файла в памяти
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Запись combined_info_df в Excel
        combined_info_df.to_excel(writer, sheet_name='Результаты расчета', index=False, startrow=0)
        
        # Определение начальной строки для данных таблицы
        data_start_row = len(combined_info_df) + 2
        
        # Запись DataFrame данных в Excel
        df.to_excel(writer, sheet_name='Результаты расчета', index=False, startrow=data_start_row)
        
        # Получение объектов workbook и worksheet
        workbook = writer.book
        worksheet = writer.sheets['Результаты расчета']
        
        # Заморозка панелей
        worksheet.freeze_panes(data_start_row + 1, 0)
        
        # Определение формата для заголовков
        header_format = workbook.add_format({
            'bold': True, 'text_wrap': True, 'valign': 'top',
            'fg_color': '#D7E4BC', 'border': 1
        })
        
        # Применение формата к заголовкам
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(data_start_row, col_num, value, header_format)
        
        # Определение формата чисел с запятой как десятичным разделителем
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        
        # Определение индекса столбца 'Нагрузка'
        load_col_index = df.columns.get_loc('Нагрузка')
        
        # Установка формата для столбца 'Нагрузка'
        worksheet.set_column(load_col_index, load_col_index, 15, number_format)
        
        # Автоширина столбцов
        for i, col in enumerate(df.columns):
            if col == 'Нагрузка':
                continue  # Уже установили ширину и формат
            max_length = max(df[col].astype(str).map(len).max(), len(col))
            worksheet.set_column(i, i, max_length + 2)
        
        # Добавление автозаполнения фильтра
        worksheet.autofilter(data_start_row, 0, data_start_row + len(df), len(df.columns) - 1)
        
        # УСЛОВНОЕ ФОРМАТИРОВАНИЕ ТОЛЬКО ДЛЯ СТОЛБЦОВ B И C
        
        # Форматы для успешных и неуспешных значений
        success_format = workbook.add_format({'bg_color': '#c6efce', 'font_color': '#004600'})
        error_format = workbook.add_format({'bg_color': '#ffc7ce', 'font_color': '#9c0006'})
        
        # Находим и форматируем коэффициент затратности
        for idx, row in combined_info_df.iterrows():
            excel_row = idx + 2  # +1 для Excel базы, +1 для заголовка
            
            if 'Коэффициент затратности' in row['Название']:
                print(f"Найден коэффициент затратности в строке {idx}, Excel строка {excel_row}")
                coef_value = float(row['Значение'])
                if coef_value >= min_coefficient:
                    # Форматируем только ячейки B и C
                    worksheet.write(f'B{excel_row}', coef_value, success_format)
                    worksheet.write(f'C{excel_row}', row['Комментарий'], success_format)
                else:
                    # Форматируем только ячейки B и C
                    worksheet.write(f'B{excel_row}', coef_value, error_format)
                    worksheet.write(f'C{excel_row}', row['Комментарий'], error_format)
                break
        
        # Находим и форматируем трудоемкость ЗЕТ
        for idx, row in combined_info_df.iterrows():
            excel_row = idx + 2  # +1 для Excel базы, +1 для заголовка
            
            if row['Название'] == 'Трудоемкость (часов ЗЕТ)':
                print(f"Найдена трудоемкость ЗЕТ в строке {idx}, Excel строка {excel_row}")
                zet_value = float(row['Значение'])
                if zet_value == 60:
                    # Форматируем только ячейки B и C
                    worksheet.write(f'B{excel_row}', zet_value, success_format)
                    worksheet.write(f'C{excel_row}', row['Комментарий'], success_format)
                else:
                    # Форматируем только ячейки B и C
                    worksheet.write(f'B{excel_row}', zet_value, error_format)
                    worksheet.write(f'C{excel_row}', row['Комментарий'], error_format)
                break
    
    # Перемотка файла в начало
    output.seek(0)
    
    # Формирование имени файла
    specialty = program_info.get('specialty', 'Расчет')
    academic_year = program_info.get('academic_year', '')
    file_name = f"Нагрузка_{specialty}_{academic_year}.xlsx"
    
    # Очистка имени файла от недопустимых символов
    file_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    file_name += '.xlsx'
    
    # Отправка файла пользователю
    return send_file(output, download_name=file_name, as_attachment=True)