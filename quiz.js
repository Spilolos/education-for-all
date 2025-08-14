// Generic quiz renderer: expects window.quizData = { title, questions: [{ prompt, options: [{text, correct}], explanation }] }

(function () {
	function $(sel, root = document) { return root.querySelector(sel); }
	function $all(sel, root = document) { return root.querySelectorAll(sel); }

	function render(container, data) {
		let currentIndex = 0;
		let numCorrect = 0;
		let answeredCorrectly = false;

		container.innerHTML = `
			<div class="bg-white rounded-xl shadow-md overflow-hidden max-w-3xl mx-auto">
				<div class="p-6">
					<div class="flex justify-between items-center mb-6">
						<h3 class="text-lg font-semibold text-gray-700">${data.title}</h3>
						<div class="flex items-center">
							<span id="progressLabel" class="text-sm text-gray-500 mr-2"></span>
							<div class="w-32 bg-gray-200 rounded-full h-2">
								<div id="quizProgressBar" class="bg-green-500 h-2 rounded-full" style="width: 0%"></div>
							</div>
						</div>
					</div>

					<div id="questionBlock" class="quiz-question mb-6"></div>

					<div id="feedback" class="hidden">
						<div id="feedbackBox" class="p-4 rounded-lg border mb-4">
							<div class="flex items-start">
								<div id="feedbackIcon" class="w-5 h-5 mr-2 mt-0.5"></div>
								<div>
									<p id="feedbackText" class="font-medium"></p>
									<p id="explanationText" class="text-sm text-gray-600 mt-1"></p>
								</div>
							</div>
						</div>
						<div class="flex gap-2">
							<button id="retryQuestion" class="hidden px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Try Again</button>
							<button id="nextQuestion" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50" disabled>Next</button>
						</div>
					</div>

					<div id="completeBlock" class="hidden text-center">
						<p class="text-xl font-semibold text-gray-800 mb-2">Great work!</p>
						<p id="scoreText" class="text-gray-700 mb-6"></p>
						<div class="flex items-center justify-center gap-2">
							<button id="retryQuiz" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Retry Quiz</button>
							<a href="dashboard.html" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Dashboard</a>
							<a href="index.html#subjects" class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Back to Subjects</a>
						</div>
					</div>
				</div>
			</div>
		`;

		const progressBar = $('#quizProgressBar', container);
		const progressLabel = $('#progressLabel', container);
		const questionBlock = $('#questionBlock', container);
		const feedback = $('#feedback', container);
		const feedbackBox = $('#feedbackBox', container);
		const feedbackText = $('#feedbackText', container);
		const explanationText = $('#explanationText', container);
		const feedbackIcon = $('#feedbackIcon', container);
		const retryQuestionBtn = $('#retryQuestion', container);
		const nextBtn = $('#nextQuestion', container);
		const completeBlock = $('#completeBlock', container);
		const scoreText = $('#scoreText', container);

		function updateProgress() {
			const total = data.questions.length;
			const pct = Math.round((currentIndex / total) * 100);
			progressBar.style.width = `${pct}%`;
			progressLabel.textContent = `Question ${Math.min(currentIndex + 1, total)} of ${total}`;
		}

		function renderQuestion() {
			answeredCorrectly = false;
			feedback.classList.add('hidden');
			retryQuestionBtn.classList.add('hidden');
			nextBtn.disabled = true;

			const q = data.questions[currentIndex];
			questionBlock.innerHTML = `
				<p class="text-lg font-medium mb-4">${q.prompt}</p>
				<div id="options" class="space-y-3"></div>
			`;

			const optionsWrap = $('#options', questionBlock);
			q.options.forEach((opt, idx) => {
				const btn = document.createElement('button');
				btn.className = 'quiz-option w-full text-left p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition';
				btn.textContent = opt.text;
				btn.dataset.correct = !!opt.correct;
				btn.dataset.index = String(idx);
				btn.addEventListener('click', () => handleAnswer(btn, q));
				optionsWrap.appendChild(btn);
			});
			updateProgress();
		}

		function resetOptionStyles() {
			$all('.quiz-option', questionBlock).forEach(b => {
				b.classList.remove('bg-green-100', 'border-green-500', 'border-green-400', 'border-red-500', 'bg-red-50');
				b.classList.add('border-gray-300');
				b.disabled = false;
			});
		}

		function handleAnswer(btn, q) {
			const isCorrect = btn.dataset.correct === 'true';
			$all('.quiz-option', questionBlock).forEach(b => b.disabled = true);

			if (isCorrect) {
				answeredCorrectly = true;
				numCorrect += 1;
				btn.classList.remove('border-gray-300');
				btn.classList.add('bg-green-100', 'border-green-500');
				feedbackBox.className = 'p-4 rounded-lg border mb-4 bg-green-50 border-green-200';
				feedbackText.className = 'text-green-700 font-medium';
				feedbackText.textContent = 'Correct!';
				explanationText.textContent = q.explanation || '';
				feedbackIcon.innerHTML = '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
				retryQuestionBtn.classList.add('hidden');
				nextBtn.disabled = false;
			} else {
				btn.classList.remove('border-gray-300');
				btn.classList.add('bg-red-50', 'border-red-500');
				feedbackBox.className = 'p-4 rounded-lg border mb-4 bg-red-50 border-red-200';
				feedbackText.className = 'text-red-700 font-medium';
				feedbackText.textContent = 'Not quite.';
				explanationText.textContent = 'Review the notes and try again.';
				feedbackIcon.innerHTML = '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
				retryQuestionBtn.classList.remove('hidden');
				nextBtn.disabled = true;
			}
			feedback.classList.remove('hidden');
		}

		retryQuestionBtn.addEventListener('click', () => {
			resetOptionStyles();
			feedback.classList.add('hidden');
			retryQuestionBtn.classList.add('hidden');
			$all('.quiz-option', questionBlock).forEach(b => b.disabled = false);
		});

		nextBtn.addEventListener('click', () => {
			if (!answeredCorrectly) return;
			currentIndex += 1;
			if (currentIndex >= data.questions.length) {
				// complete
				progressBar.style.width = '100%';
				progressLabel.textContent = `Complete`;
				questionBlock.classList.add('hidden');
				feedback.classList.add('hidden');
				completeBlock.classList.remove('hidden');
				scoreText.textContent = `You scored ${numCorrect} out of ${data.questions.length}.`;
				
				// Save quiz result to backend if authenticated
				saveQuizResult(numCorrect, data.questions.length);
			} else {
				renderQuestion();
			}
		});

		$('#retryQuiz', container)?.addEventListener('click', () => {
			currentIndex = 0;
			numCorrect = 0;
			questionBlock.classList.remove('hidden');
			completeBlock.classList.add('hidden');
			renderQuestion();
		});

		renderQuestion();
	}

	// Function to save quiz result to backend
	async function saveQuizResult(score, totalQuestions) {
		// Check if user is authenticated
		const token = localStorage.getItem('token');
		if (!token) {
			console.log('User not authenticated, skipping result save');
			return;
		}

		try {
			// Determine subject from quiz data
			const subject = window.quizData.title.replace(' Quiz', '');
			
			const response = await fetch(`${window.location.origin}/api/quiz-results`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					subject: subject,
					score: score,
					total_questions: totalQuestions
				})
			});

			if (response.ok) {
				console.log('Quiz result saved successfully');
			} else {
				console.error('Failed to save quiz result');
			}
		} catch (error) {
			console.error('Error saving quiz result:', error);
		}
	}

	document.addEventListener('DOMContentLoaded', () => {
		const container = document.getElementById('quizApp');
		if (!container || !window.quizData) return;
		render(container, window.quizData);
	});
})();