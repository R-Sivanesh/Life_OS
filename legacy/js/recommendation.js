const recommendedSkill = () => {
  const learningRoadmap = [
    'HTML', 'CSS', 'JavaScript', 'DOM', 'Git', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'Python', 'Machine Learning', 'Deep Learning', 'AI Projects'
  ];
  const todayData = JSON.parse(localStorage.getItem('lifeOsDaily_' + new Date().toISOString().slice(0, 10)) || 'null');
  if (!todayData || !todayData.skillLearned) return learningRoadmap[0];
  const currentIndex = learningRoadmap.indexOf(todayData.skillLearned);
  return learningRoadmap[currentIndex + 1] || learningRoadmap[learningRoadmap.length - 1];
};

window.addEventListener('load', () => {
  const nextSkill = recommendedSkill();
  const recContainer = document.getElementById('recommendations');
  if (recContainer) {
    const skillTip = document.createElement('div');
    skillTip.className = 'recommendation-block tip';
    skillTip.innerHTML = `
      <div class="rec-meta"><h4>Next Skill</h4><span>${nextSkill}</span></div>
      <button>Explore Skill</button>
    `;
    recContainer.appendChild(skillTip);
  }
});
